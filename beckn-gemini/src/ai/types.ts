import { BaseMessage } from "@langchain/core/messages";

export type Content = string | {
  type: string;
  text: string;
};

export { BaseMessage };
export { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export interface PromptTemplate {
  prompt: string | Content[];
}

export interface GraphContext {
  whatsappNumber: string;
  userMessage: string;
  session?: any;
  mediaUrl?: string;
  sellDetails?: string;
  llmResponse?: string;
  currentPrompt?: string;
  systemPrompt?: string;
  [key: string]: any;
} 