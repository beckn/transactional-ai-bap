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
import { BecknLangGraph } from './beckn-langgraph';
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
    
    let formattedPrompt = prompt;
    if (prefix_prompt) {
      formattedPrompt = prefix_prompt.map(p => 
        `${p.role}: ${p.parts[0].text}`
      ).join('\n') + '\n' + prompt;
    }

    const response = await llm.generateResponse({
      prompt: formattedPrompt
    });

    return response.text;
  } catch (err: any) {
    console.log(err);
    return messages.APPOLOGY_MESSAGE;
  }
};

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
      "../../../../whatsapp-ai-agent-key-file.json"
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

export const handleConversationFlow = async (whatsappNumber: string, userMessage: string) => {
  const graph = new BecknLangGraph();

  // Define nodes
  graph.addNode({
    id: 'start',
    type: 'llm',
    next: ['intent_check']
  });

  graph.addNode({
    id: 'intent_check',
    type: 'action'
  });

  // Define edges
  graph.addEdge({
    from: 'start',
    to: 'intent_check',
    condition: (context: GraphContext) => context.llmResponse?.includes('intent') || false
  });

  // Set context
  graph.setContext('currentPrompt', userMessage);
  graph.setContext('systemPrompt', prompts.systemInstruction);
  graph.setContext('action', async (context: GraphContext) => {
    // Handle intent logic
    console.log('Processing intent:', context.llmResponse);
  });

  // Execute graph
  const result = await graph.execute('start');
  return result;
};
