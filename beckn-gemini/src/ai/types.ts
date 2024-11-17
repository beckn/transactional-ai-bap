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

// Add these types if @langchain/core installation doesn't work
export interface BaseMessage {
  content: string;
  type: string;
}

export class HumanMessage implements BaseMessage {
  type: string = 'human';
  constructor(public content: string) {}
}

export class AIMessage implements BaseMessage {
  type: string = 'ai';
  constructor(public content: string) {}
}

export class SystemMessage implements BaseMessage {
  type: string = 'system';
  constructor(public content: string) {}
} 