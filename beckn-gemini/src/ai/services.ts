import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { prompts } from "../constant";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_NAME as string,
  systemInstruction: prompts.systemInstruction
});
export const getAiReponse = async (prompt: string) => {
  try {
    const data = await model.generateContent(prompt);
    return data.response.text();
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};
