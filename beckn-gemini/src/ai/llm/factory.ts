import { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini-provider";
// import { OpenAIProvider } from "./openai-provider";

export type ProviderType = 'gemini' | 'openai';

export class LLMFactory {
  private static instance: LLMProvider | null = null;

  static getProvider(provider: ProviderType = 'gemini'): LLMProvider {
    if (!this.instance) {
      switch (provider) {
        // case 'openai':
        //   this.instance = new OpenAIProvider();
        //   break;
        case 'gemini':
        default:
          this.instance = new GeminiProvider();
      }
    }
    return this.instance;
  }

  static setProvider(provider: ProviderType): void {
    switch (provider) {
      // case 'openai':
      //   this.instance = new OpenAIProvider();
      //   break;
      case 'gemini':
      default:
        this.instance = new GeminiProvider();
    }
  }

  static clearInstance(): void {
    this.instance = null;
  }
} 