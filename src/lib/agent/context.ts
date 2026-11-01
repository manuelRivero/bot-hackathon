import type { RunnableConfig } from "@langchain/core/runnables";

export interface AgentContext {
  conversationId: string;
}

/**
 * Único contrato entre el runner del agente y las tools: nunca pasarles
 * datos de negocio por closure, siempre por config.configurable.
 */
export function getAgentContext(config: RunnableConfig | undefined): AgentContext {
  const conversationId = config?.configurable?.conversationId;
  if (typeof conversationId !== "string" || !conversationId) {
    throw new Error("agent_context_missing_conversationId");
  }
  return { conversationId };
}
