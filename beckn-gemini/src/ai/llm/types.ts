export interface LLMResponse {
  text: string;
  metadata?: any;
}

export interface LLMRequest {
  prompt: string | Content[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  generateResponse(request: LLMRequest): Promise<LLMResponse>;
  generateStreamingResponse?(request: LLMRequest): AsyncGenerator<LLMResponse>;
} 