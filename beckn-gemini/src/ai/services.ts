import {
  GoogleGenerativeAI,
  GenerateContentRequest
} from "@google/generative-ai";
import dotenv from "dotenv";
import { prompts } from "../constant";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_NAME as string,
  systemInstruction: prompts.systemInstruction
});
export const getAiReponseFromUserPrompt = async (prompt: string) => {
  try {
    let some: GenerateContentRequest = {
      contents: [
        {
          role: "model",
          parts: [{ text: "You are an AI Bot Helping People" }]
        },
        {
          role: "model",
          parts: [
            {
              text: "If the message is in greeting then only repond with a greeting message"
            }
          ]
        },
        {
          role: "model",
          parts: [
            {
              text: "You should check whether the message contains some intent to buy some energy from the open network"
            }
          ]
        },
        {
          role: "model",
          parts: [
            {
              text: "If there is an intent to buy or search energy providers then reply only 'make_beckn_call'"
            }
          ]
        },
        {
          role: "model",
          parts: [
            {
              text: "If there is no intent to buy or search energy providers then provide relevant results to the user"
            }
          ]
        },
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const data = await model.generateContent(some);
    return data.response.text();
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};

export const getAiReponseGeneralContent = async (prompt: string) => {
  try {
    let some: GenerateContentRequest = {
      contents: [
        {
          role: "model",
          parts: [{ text: "You are an AI Bot Helping People" }]
        },
        {
          role: "model",
          parts: [
            {
              text: "Create a meaningfull human friendly message from the provided json"
            }
          ]
        },
        {
          role: "model",
          parts: [
            {
              text: "If the responses object is not empty then create message in an ordered list format for the providers along with the details of the quantity and price"
            }
          ]
        },
        {
          role: "model",
          parts: [
            {
              text: "If the responses object is empty then reply only 'Found a list of Household supplying energy'"
            }
          ]
        },
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const data = await model.generateContent(some);
    return data.response.text();
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};
