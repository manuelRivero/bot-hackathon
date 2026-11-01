/**
 * Pub/sub en memoria para notificar a una conversación abierta (ej. el chat
 * del cliente) cuando algo cambia del lado del admin. Vive en memoria del
 * proceso — correcto para un solo servidor de Next.js (hackathon/demo), no
 * escala a múltiples instancias sin un bus externo (Redis, etc.).
 */
type Listener = (payload: unknown) => void;

const listenersByConversation = new Map<string, Set<Listener>>();

export function subscribe(conversationId: string, listener: Listener): () => void {
  if (!listenersByConversation.has(conversationId)) {
    listenersByConversation.set(conversationId, new Set());
  }
  listenersByConversation.get(conversationId)!.add(listener);

  return () => {
    const set = listenersByConversation.get(conversationId);
    set?.delete(listener);
    if (set && set.size === 0) {
      listenersByConversation.delete(conversationId);
    }
  };
}

export function publish(conversationId: string, payload: unknown): void {
  listenersByConversation.get(conversationId)?.forEach((listener) => listener(payload));
}
