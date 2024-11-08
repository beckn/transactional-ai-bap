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