import type { CartView } from "@/lib/services/cart";

/** Lo que se manda como historial al agente — siempre texto llano. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Lo que se renderiza en el feed del chat — puede ser texto o un componente. */
export type DisplayMessage =
  | { id: string; kind: "text"; role: "user" | "assistant"; content: string }
  | { id: string; kind: "cart_update"; addedItemName: string; cart: CartView }
  | { id: string; kind: "payment_choice" };
