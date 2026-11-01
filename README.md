# Bot Hackathon — Agente ReAct para un restaurante

Chatbot conversacional para un restaurante ficticio, construido como agente **ReAct** (LangGraph
+ OpenAI) sobre Next.js. El cliente pide todo por chat (menú, carrito, confirmación, dirección y
método de pago) y hay un panel de administración para gestionar los pedidos que llegan.

## Demo en vivo

- **Chat del cliente:** http://201.32.132.184
- **Panel de administración:** http://201.32.132.184/admin

> El dominio `dwday-91891350.online` está en proceso de propagación DNS — mientras tanto usar la IP.

📄 **Detalle técnico de las decisiones de diseño:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## Cómo evaluar — flujo sugerido

### 1. Chat del cliente (`/`)

1. Al entrar, el bot se presenta solo usando los datos reales del negocio (nombre, tipo de
   cocina) — no es un saludo genérico.
2. Probar la **vitrina**: botón flotante "Ver menú 🍽" (abajo a la derecha) abre un panel lateral
   con los platos. Clickear cualquier item **sin confirmar nada por botón** — se agrega al
   carrito al instante (aparece una card nativa en el chat) y el bot reacciona con un comentario
   contextual (ingredientes, si es picante, si es para compartir, etc., según el plato).
3. Pedir algo más por texto libre, ej: *"¿tienen algo vegetariano?"*, *"dame otra pizza"*,
   *"¿qué ingredientes tiene la hamburguesa picante?"*.
4. Decir *"eso es todo"* o similar — ahí el bot pide el nombre (no antes, para no cortar las ganas
   de seguir pidiendo).
5. Confirmar el pedido. El bot sigue automáticamente pidiendo:
   - **Dirección de entrega** (texto libre, sin validación — es una demo).
   - **Método de pago**: acá aparecen botones (Efectivo / Pago online) — también se puede
     responder escribiendo ("pago en efectivo", "con tarjeta", etc.), el bot entiende ambos
     caminos por igual.
6. Botón **"↺ Empezar de nuevo"** (arriba del chat) reinicia la conversación sin perder el pedido
   ya confirmado.

### 2. Panel de administración (`/admin`)

1. Ver la tabla de pedidos (fecha, cliente, items, total, método de pago, estado).
2. Click en **"Ver detalle"** → modal con el desglose completo del pedido.
3. Click en **"Despachar pedido"** → lo marca como despachado (modal de éxito) y, si el cliente
   sigue con el chat abierto en otra pestaña, le llega **en tiempo real** (sin recargar) un
   mensaje avisando que su pedido fue despachado — vía un canal de notificaciones (SSE).

---

## Qué mirar si se evalúa el diseño del agente

- **Las tools hacen los efectos, el LLM solo razona y redacta.** El agente nunca escribe directo
  a los datos — todo pasa por funciones puras + tools con gates (`src/lib/services/`,
  `src/lib/agent/tools/`).
- **Botones y texto libre llegan al mismo efecto.** El botón de método de pago no depende de que
  el modelo "se acuerde" de llamar la tool: el click aplica el efecto de forma determinística y
  recién después el LLM reacciona en lenguaje natural.
- **Metadata del menú alimenta la conversación, no solo el catálogo.** Cada plato tiene
  ingredientes, alérgenos, nivel de picante, para cuántas personas y preparación
  (`data/menu.json`) — el bot elige qué mencionar (máx. 2 datos, priorizados) en vez de recitar
  una ficha técnica.
- **"Base de datos" = archivos JSON** en `/data` (`menu.json`, `business.json`, `carts.json`,
  `orders.json`), pensado para un hackathon: sin infraestructura de BD real.

---

## Stack técnico

- **Next.js 16** (App Router, TypeScript)
- **LangGraph** (`createReactAgent`) + **LangChain** + **OpenAI** (`gpt-4o-mini`)
- Persistencia: archivos JSON locales (sin base de datos externa)
- Notificaciones en tiempo real: Server-Sent Events (pub/sub en memoria)
- Deploy: VPS (Ubuntu) con Nginx como reverse proxy + PM2

## Correrlo en local

```bash
git clone https://github.com/manuelRivero/bot-hackathon.git
cd bot-hackathon
npm install

# crear .env.local con:
# OPENAI_API_KEY=sk-...

npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) (chat) y
[http://localhost:3000/admin](http://localhost:3000/admin) (panel).

## Estructura relevante

```
data/                   # "base de datos": menu, business, carts, orders (JSON)
src/app/                # rutas Next.js (chat, /admin, API routes)
src/components/         # UI: chat, vitrina, admin, modales
src/lib/agent/          # el agente ReAct: prompt, tools, contexto
src/lib/services/       # lógica de negocio pura (carrito, pedidos, hooks de conversación)
src/lib/db/             # acceso a los JSON (única puerta de lectura/escritura)
```
