import type { MenuItem } from "@/lib/db/menu";

export type ConversationHook =
  | { type: "allergen"; allergens: string[] }
  | { type: "spice"; level: "medium" | "hot" }
  | { type: "shareable"; servesPeople: number }
  | { type: "preparation"; detail: string };

const MAX_HOOKS = 2;

/**
 * Decide QUÉ metadata vale la pena mencionar tras agregar un item — nunca
 * CÓMO decirlo (eso es trabajo del LLM). Orden de prioridad fijo:
 * seguridad (alérgenos) > experiencia (picante) > logística (para compartir)
 * > color de producto (preparación). Función pura, sin IO, testeable sin LLM.
 */
export function selectConversationHooks(item: MenuItem): ConversationHook[] {
  const hooks: ConversationHook[] = [];

  if (item.allergens.length > 0) {
    hooks.push({ type: "allergen", allergens: item.allergens });
  }

  if (item.spiceLevel === "medium" || item.spiceLevel === "hot") {
    hooks.push({ type: "spice", level: item.spiceLevel });
  }

  if (item.servesPeople > 1) {
    hooks.push({ type: "shareable", servesPeople: item.servesPeople });
  }

  if (item.preparation && hooks.length < MAX_HOOKS) {
    hooks.push({ type: "preparation", detail: item.preparation });
  }

  return hooks.slice(0, MAX_HOOKS);
}
