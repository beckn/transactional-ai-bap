import {
  GoogleGenerativeAI,
  GenerateContentRequest,
  Content
} from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";
import { deleteKey, getKey, IBecknCache, setKey } from "../cache";
import { messages, prompts } from "../constant";
import vision from "@google-cloud/vision";
import path from "path";
import { LLMFactory } from './llm/factory';
dotenv.config();

// Define GraphContext interface
interface GraphContext {
  llmResponse?: string;
  currentPrompt?: string;
  systemPrompt?: string;
  [key: string]: any;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_NAME as string,
  systemInstruction: prompts.systemInstruction
});

export const getAiReponseFromPrompt = async (
  prefix_prompt: Content[] | null,
  prompt: string
) => {
  try {
    const llm = LLMFactory.getProvider();
    
    // Format the prompt properly
    let formattedPrompt: Content[] = [];

    // Add prefix prompts if they exist
    if (prefix_prompt) {
      formattedPrompt.push(...prefix_prompt);
    }

    // Add the user prompt if it exists
    if (prompt.length) {
      formattedPrompt.push({
        role: "user",
        parts: [{ text: prompt }]
      });
    }

    const response = await llm.generateResponse({
      prompt: formattedPrompt
    });

    // Only do minimal cleaning - remove markdown if present
    let cleanedResponse = response.text;
    if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse
        .replace(/```json\n/g, '')
        .replace(/```\n/g, '')
        .replace(/```/g, '')
        .trim();
    }

    // Return the response directly without additional processing
    return cleanedResponse;

  } catch (err: any) {
    console.log(err);
    return messages.APPOLOGY_MESSAGE;
  }
};


// export const getAiReponseFromPrompt = async (
//   prefix_prompt: Content[] | null,
//   prompt: string
// ) => {
//   try {
//     let formattedPromt: GenerateContentRequest = {
//       contents: []
//     };
//     if (prefix_prompt) {
//       formattedPromt.contents.push(...prefix_prompt);
//     }
//     if (prompt.length) {
//       formattedPromt.contents.push({
//         role: "user",
//         parts: [
//           {
//             text: prompt
//           }
//         ]
//       });
//     }
//     const data = await model.generateContent(formattedPromt);
//     // console.log("Response==>", data.response.text());
//     return data.response.text();
//   } catch (err: any) {
//     console.log(err);
//     return messages.APPOLOGY_MESSAGE;
//   }
// };




export const getSession = (whatsappNumber: string): any => {
  return getKey(whatsappNumber);
};

export const deleteSession = (whatsappNumber: string): any => {
  return deleteKey(whatsappNumber);
};

export const createSession = (whatsappNumber: string): any => {
  return setKey(whatsappNumber, {
    chats: []
  });
};

export const updateSession = (whatsappNumber: string, session: IBecknCache) => {
  return setKey(whatsappNumber, session);
};

export const imageRecognition = async (url: string) => {
  try {
    const keyFilePath = path.join(
      __dirname,
      "../../whatsapp-ai-agent-key-file.json"
    );

    // Creates a client
    const client = new vision.ImageAnnotatorClient({
      keyFilename: keyFilePath
    });


    // Performs text detection on the image URL
    const [result] = await client.textDetection(url);
    const detections = result.textAnnotations;
    console.log("Text:");
    let data = "";
    [...(detections as any[])].forEach(
      (text) => (data = data + text.description)
    );
    console.log("Image Data: data");
    return data;
  } catch (err: any) {
    console.log("Error Occured in Image Recognition===>", err);
    throw new Error(err.message);
  }
};
