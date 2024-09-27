import { Response } from "express";
import { prefix_prompt_group, PROFILE_ACTIONS } from "../constant";
import { sendResponseToWhatsapp } from "../twilio/services";
import {
  createSession,
  getAiReponseFromPrompt,
  getSession,
  updateSession
} from "./services";

export const consumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  try {
    console.log("\n===>Consumer Flow Called<===\n");
    let session = getSession(whatsappNumber);
    if (!session) {
      createSession(whatsappNumber);
      session = getSession(whatsappNumber);
    }
    if (!session.chats.length) {
      // Fresh Entry Send Signup Message
      const signUpMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiSignupAsk,
        ""
      );
      console.log("Sign Up Message==>", signUpMessage);
      session.chats.push({
        role: "model",
        text: signUpMessage,
        message_id: "",
        json: "",
        action: PROFILE_ACTIONS.SIGNUP
      });
      updateSession(whatsappNumber, session);
      await sendResponseToWhatsapp({
        body: signUpMessage,
        receiver: whatsappNumber.split(":")[1]
      });
      console.log("Session Content===>", getSession(whatsappNumber));
      return res.send("message");
    } else {
      console.log("In else block");
    }
  } catch (err) {
    console.log(err);
  }
};

export const presumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  console.log("Presumer Flow Called");
  await sendResponseToWhatsapp({
    body: "Presumer Flow Called",
    receiver: whatsappNumber.split(":")[1]
  });
  return res.send("message sent");
};

export const generalFlow = async () => {};
