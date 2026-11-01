# Arquitectura técnica

Este documento explica **qué se construyó y por qué**, para quien quiera evaluar las decisiones
de diseño del agente y no solo probar la interfaz (eso está en `README.md`).

## 1. Resumen

Un agente conversacional **ReAct** (razonar → actuar con tools → observar → repetir) construido
con **LangGraph** (`createReactAgent`) + **OpenAI**, montado sobre **Next.js** (App Router). La
"base de datos" son archivos JSON planos en `/data` — decisión deliberada de hackathon: sin
infraestructura externa, pero con la misma disciplina de capas que un sistema con BD real.

## 2. Principio rector: el LLM razona, las tools hacen efectos

Esta es la regla que organiza todo el código del agente (`src/lib/agent/`, `src/lib/services/`,
`src/lib/db/`):

| Capa | Hace | No hace |
|---|---|---|
| **Agente (LLM)** | Interpreta lenguaje natural, decide qué tool llamar, redacta la respuesta | Nunca escribe directo a los JSON |
| **Tools** (`src/lib/agent/tools/`) | Adaptador fino: toma el input del LLM, llama al servicio, devuelve JSON estructurado | No contienen lógica de negocio propia |
| **Servicios** (`src/lib/services/`) | Lógica de negocio pura: mutaciones del carrito/pedido, gates, derivación de estado | No conocen al LLM ni al framework de tools |
| **DB** (`src/lib/db/`) | Única puerta de lectura/escritura a los JSON | No valida reglas de negocio |

El beneficio concreto: la misma función de servicio (`addItemToCart`, `setPaymentMethod`, etc.)
la usan tanto la tool del agente como un endpoint HTTP llamado directo desde la UI (ver §4) — no
hay dos implementaciones del mismo efecto que puedan desincronizarse.

## 3. Estado derivado, nunca persistido

Ningún "paso actual" se guarda en el JSON. Todo paso se **deriva** de los datos reales en cada
request:

```ts
// src/lib/db/carts.ts
function getOrderStatus(cart): "empty" | "missing_name" | "ready_to_confirm"

// src/lib/db/orders.ts
function getPostOrderStep(order): "awaiting_address" | "awaiting_payment" | "done"
```

Si el carrito tiene items y nombre, está `ready_to_confirm` — no importa cómo se llegó ahí. Esto
evita una clase entera de bugs (el paso persistido que queda desincronizado del dato real) y es
la única fuente de verdad que usan el prompt del agente, los gates de las tools, y la UI.

## 4. Gates: efectos irreversibles no dependen de que el LLM "se acuerde"

Dos tipos de acciones en el flujo de pedido:

- **Reversibles / libres** (agregar/quitar del carrito, ver el carrito): el LLM las llama cuando
  quiere, sin restricción.
- **Irreversibles o deterministas por UI** (confirmar pedido, fijar método de pago desde un
  botón): tienen un **gate** que valida el prerequisito antes de ejecutar, y devuelven un error
  estructurado y predecible si falta algo:

```ts
// confirm_order, por ejemplo
if (status === "empty") return { error: "items_required", missing: "items" };
if (status === "missing_name") return { error: "customer_name_required", missing: "customer_name" };
```

El prompt le dice al modelo cómo reaccionar ante cada error — pero el gate existe en el código,
no como una instrucción que el modelo podría ignorar.

**Caso especial — botones vs. texto libre:** el método de pago se puede elegir con botones en la
UI o escribiéndolo. Si el click solo mandara el texto "Pago en efectivo" al chat y dependiera de
que el LLM decida llamar `set_payment_method`, un día el modelo simplemente **no llama la tool**
y el dato nunca se guarda (nos pasó en una iteración temprana). La solución: el click dispara un
endpoint dedicado (`/api/order/payment-method`) que aplica el efecto de forma determinística, y
**recién después** se le avisa al LLM (con un marcador `[EVENTO_PAGO]`) para que redacte la
confirmación — nunca para que ejecute el efecto. Mismo patrón para agregar un item desde la
vitrina (`/api/cart/add` + marcador `[EVENTO_VITRINA]`).

## 5. El agente y sus tools

`src/lib/agent/menuAgent.ts` arma el agente con `createReactAgent({ llm, tools, prompt })` y un
prompt con secciones fijas: reglas duras de negocio, reglas del flujo de pedido, cómo reaccionar
ante los eventos deterministas (`[EVENTO_VITRINA]`, `[EVENTO_PAGO]`), y la lista de tools
disponibles.

**Tools de solo lectura:** `get_business_info`, `get_menu`, `search_menu_item`,
`get_menu_item_details`.

**Tools de escritura (carrito/pedido):** `add_item_to_cart`, `remove_item_from_cart`,
`view_cart`, `set_customer_name`, `confirm_order` (gate), `set_delivery_address`,
`set_payment_method` (gate).

El contexto de cada request (`conversationId`) se pasa por `config.configurable`, **nunca por
closure** — así cada conversación opera sobre su propio carrito sin cruzarse con otras.

## 6. Metadata del menú como pie para conversación, no solo catálogo

Cada item de `data/menu.json` tiene `ingredients`, `allergens`, `spiceLevel`, `servesPeople` y
`preparation`. En vez de que el bot recite esa ficha completa, una función pura
(`src/lib/services/conversationHooks.ts`) decide **qué 1-2 datos vale la pena mencionar**, con
una prioridad fija (alérgeno > picante > para compartir > preparación), y se los pasa al LLM como
datos crudos para que los redacte en una frase natural con una pregunta de seguimiento. La
*selección* es determinística; la *redacción* es del modelo.

## 7. Flujo completo de un pedido

```
agregar items (texto o vitrina)
  → "¿algo más?" hasta que el cliente dice que terminó
  → pedir nombre
  → confirm_order (gate: items + nombre)
      ├─ error → el LLM pide lo que falta, no reintenta sola
      └─ éxito → nextStep: "awaiting_address"
  → pedir dirección (sin validar, es demo)
  → set_delivery_address → nextStep: "awaiting_payment"
  → mostrar botones de pago (derivados de /api/order/pending, no de que el LLM se acuerde)
  → set_payment_method (gate: requiere dirección ya puesta)
      └─ éxito → nextStep: "done" → mensaje de cierre con resumen
```

## 8. Notificaciones en tiempo real (admin → chat del cliente)

Cuando se despacha un pedido desde `/admin`, el cliente que tiene el chat abierto recibe el aviso
sin recargar la página. Implementado con **Server-Sent Events**:

- `src/lib/events/bus.ts`: pub/sub en memoria, keyed por `conversationId`.
- `GET /api/chat/stream?conversationId=...`: el chat abre esta conexión al montar.
- `POST /api/admin/orders/[id]/dispatch`: al marcar el pedido, publica el evento en el bus.

Limitación consciente: el bus vive en memoria de un solo proceso Node — correcto para esta demo
(un solo servidor), no escalaría a múltiples instancias sin un bus externo (Redis, etc.).

## 9. Simplificaciones deliberadas

Este proyecto toma como base conceptual un documento interno ("Agent Factory") de un sistema de
producción con agentes ReAct más complejos (sesiones con Ownership, múltiples agentes
especializados coordinados, handoff entre ellos). Para el alcance de un hackathon se tomaron solo
los principios que previenen bugs reales (tools como única superficie de efectos, gates
declarados, estado derivado, botón y texto al mismo camino) y se descartaron deliberadamente:
sesiones persistentes con flags de Ownership, múltiples agentes coordinados, y validación de
datos de usuario (la dirección, por ejemplo, no se valida — es una demo).

## 10. Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **LangGraph** (`@langchain/langgraph`, `createReactAgent`) + **LangChain** + **OpenAI**
  (`gpt-4o-mini`)
- **Tailwind CSS** para estilos
- **react-markdown** + **remark-gfm** para renderizar las respuestas del bot
- Persistencia: JSON planos en `/data`, sin base de datos externa
- Deploy: VPS Ubuntu, Nginx (reverse proxy) + PM2 (proceso persistente)
