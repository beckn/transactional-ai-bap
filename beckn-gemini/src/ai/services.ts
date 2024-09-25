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
    const context = [
      {
        role: "assistant",
        content:
          "You are an AI agent that is cable of doing transcations to open network related to energy domain"
      },
      {
        role: "assistant",
        content:
          "You should check whether the message contains some intent to buy some energy from the open network"
      },
      {
        role: "assistant",
        content: "Your tone should be polite and helpful. "
      },
      { role: "user", content: prompt }
    ];
    const context2 = [
      "You are cable of doing transcations to open network related to energy domain",
      "You should check whether the message contains some intent to buy some energy from the open network",
      "If there is an intent to buy some energy then reply only in true else respond with relevant information",
      prompt
    ];
    const data = await model.generateContent(context2);
    return data.response.text();
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};
