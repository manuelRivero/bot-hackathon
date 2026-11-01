import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { findMenuItems, getMenu, getMenuItemById } from "@/lib/db/menu";

const toJson = (value: unknown) => JSON.stringify(value);

export const getMenuTool = new DynamicStructuredTool({
  name: "get_menu",
  description:
    "Devuelve el menú completo agrupado por categorías, con todos los items (precio, disponibilidad, tags). Usala cuando el cliente pide ver el menú entero o una categoría.",
  schema: z.object({}),
  func: async () => {
    const categories = await getMenu();
    return toJson({ categories });
  },
});

export const searchMenuItemTool = new DynamicStructuredTool({
  name: "search_menu_item",
  description:
    "Busca items del menú por nombre, descripción o tag (ej: 'pizza', 'vegetariano', 'postre'). Devuelve una lista, puede venir vacía.",
  schema: z.object({
    query: z.string().describe("Texto a buscar, en lenguaje natural o palabra clave"),
  }),
  func: async ({ query }) => {
    const items = await findMenuItems(query);
    return toJson({ items });
  },
});

export const getMenuItemDetailsTool = new DynamicStructuredTool({
  name: "get_menu_item_details",
  description:
    "Devuelve el detalle de un item puntual del menú a partir de su id (el id se obtiene de get_menu o search_menu_item).",
  schema: z.object({
    itemId: z.string().describe("El id del item, ej: 'prin-01'"),
  }),
  func: async ({ itemId }) => {
    const item = await getMenuItemById(itemId);
    if (!item) {
      return toJson({ error: "item_not_found", itemId });
    }
    return toJson({ item });
  },
});

export const menuTools = [getMenuTool, searchMenuItemTool, getMenuItemDetailsTool];
