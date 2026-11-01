import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getAgentContext } from "@/lib/agent/context";
import {
  addItemToCart,
  confirmOrder,
  getCartView,
  removeItemFromCart,
  setCustomerName,
} from "@/lib/services/cart";

const toJson = (value: unknown) => JSON.stringify(value);

export const viewCartTool = new DynamicStructuredTool({
  name: "view_cart",
  description:
    "Muestra el carrito actual: items, cantidades, total, nombre del cliente y el estado del pedido (empty / missing_name / ready_to_confirm). Usala antes de confirmar o cuando el cliente pregunta qué lleva pedido.",
  schema: z.object({}),
  func: async (_input, _runManager, config) => {
    const { conversationId } = getAgentContext(config);
    const cart = await getCartView(conversationId);
    return toJson(cart);
  },
});

export const addItemToCartTool = new DynamicStructuredTool({
  name: "add_item_to_cart",
  description:
    "Agrega una cantidad de un item del menú al carrito (o suma cantidad si ya estaba). El itemId sale de get_menu o search_menu_item.",
  schema: z.object({
    itemId: z.string().describe("Id del item del menú, ej: 'prin-01'"),
    quantity: z.number().int().positive().default(1),
  }),
  func: async ({ itemId, quantity }, _runManager, config) => {
    const { conversationId } = getAgentContext(config);
    const result = await addItemToCart(conversationId, itemId, quantity);
    if (!result.ok) {
      return toJson({ error: result.error, itemId });
    }
    return toJson({ success: true, cart: result.cart });
  },
});

export const removeItemFromCartTool = new DynamicStructuredTool({
  name: "remove_item_from_cart",
  description: "Quita un item del carrito por completo (todas sus unidades), por itemId.",
  schema: z.object({
    itemId: z.string(),
  }),
  func: async ({ itemId }, _runManager, config) => {
    const { conversationId } = getAgentContext(config);
    const result = await removeItemFromCart(conversationId, itemId);
    if (!result.ok) {
      return toJson({ error: result.error, itemId });
    }
    return toJson({ success: true, cart: result.cart });
  },
});

export const setCustomerNameTool = new DynamicStructuredTool({
  name: "set_customer_name",
  description:
    "Guarda el nombre del cliente para el pedido. Es obligatorio antes de poder confirmar.",
  schema: z.object({
    name: z.string().min(1),
  }),
  func: async ({ name }, _runManager, config) => {
    const { conversationId } = getAgentContext(config);
    const cart = await setCustomerName(conversationId, name);
    return toJson({ success: true, cart });
  },
});

export const confirmOrderTool = new DynamicStructuredTool({
  name: "confirm_order",
  description:
    "Confirma el pedido y lo crea de forma DEFINITIVA (efecto irreversible). Solo llamala " +
    "después de que el cliente haya confirmado explícitamente el carrito completo (items + " +
    "nombre). Si falta algo, devuelve un error estructurado indicando qué falta — no reintentes " +
    "sola, pedile el dato al cliente.",
  schema: z.object({}),
  func: async (_input, _runManager, config) => {
    const { conversationId } = getAgentContext(config);
    const result = await confirmOrder(conversationId);
    if (!result.ok) {
      return toJson({ error: result.error, missing: result.error.replace("_required", "") });
    }
    return toJson({ success: true, order: result.order });
  },
});

export const orderTools = [
  viewCartTool,
  addItemToCartTool,
  removeItemFromCartTool,
  setCustomerNameTool,
  confirmOrderTool,
];
