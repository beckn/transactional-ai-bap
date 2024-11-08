// import OpenAI from 'openai';
// import { LLMProvider, LLMRequest, LLMResponse } from './types';
// import dotenv from "dotenv";
// dotenv.config();

// export class OpenAIProvider implements LLMProvider {
//   private client: OpenAI;

//   constructor() {
//     this.client = new OpenAI({
//       apiKey: process.env.OPENAI_API_KEY
//     });
//   }

//   async generateResponse(request: LLMRequest): Promise<LLMResponse> {
//     const { prompt, systemPrompt, temperature = 0.7, maxTokens } = request;

//     const completion = await this.client.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
//         { role: "user", content: prompt }
//       ],
//       temperature,
//       max_tokens: maxTokens,
//     });

//     return {
//       text: completion.choices[0].message.content || "",
//       metadata: completion
//     };
//   }
// } 