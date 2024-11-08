import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider, LLMRequest, LLMResponse } from "./types";
import dotenv from "dotenv";
dotenv.config();

export class GeminiProvider implements LLMProvider {
  private model: any;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    this.model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL_NAME as string
    });
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const { prompt, systemPrompt } = request;
      
      // Combine system prompt and user prompt if system prompt exists
      const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;





      
      // Format the prompt according to Gemini's API requirements
      const formattedPrompt = {
        contents: [{
          role: "user",
          parts: [{
            text: finalPrompt
          }]
        }]
      };

      const result = await this.model.generateContent(formattedPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        metadata: response
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
} 