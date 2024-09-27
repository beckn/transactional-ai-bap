import {
  GoogleGenerativeAI,
  GenerateContentRequest,
  Content
} from "@google/generative-ai";
import dotenv from "dotenv";
import { deleteKey, getKey, IBecknCache, setKey } from "../cache";
import { messages, prompts } from "../constant";
dotenv.config();

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
    let formattedPromt: GenerateContentRequest = {
      contents: []
    };
    if (prefix_prompt) {
      formattedPromt.contents.push(...prefix_prompt);
    }
    if (prompt.length) {
      formattedPromt.contents.push({
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      });
    }

    const data = await model.generateContent(formattedPromt);
    return data.response.text();
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
