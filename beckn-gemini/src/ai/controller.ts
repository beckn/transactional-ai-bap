import { NextFunction, Request, Response } from "express";

import axios from "axios";
import { sendResponseToWhatsapp } from "../twilio/services";
import {
  createSession,
  deleteSession,
  getAiReponseFromPrompt,
  getSession,
  updateSession
} from "./services";
import { makeBecknCall } from "../beckn/services";
import {
  BECKN_ACTIONS,
  prefix_prompt_group,
  PROFILE_ACTIONS
} from "../constant";

export const webhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Whatsapp Request Received from", req.body.From);
    // For Image Processing Code Modification Required
    if (req?.body?.MediaUrl0) {
      const data = await axios.get(req?.body?.MediaUrl0, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SSID as string,
          password: process.env.TWILIO_API_TOKEN as string
        }
      });
      console.log(data.data);
      return;
    }

    // Detect Greeting message
    const isGreetingPrompt = await getAiReponseFromPrompt(
      prefix_prompt_group.aiDetectGreeting,
      req?.body?.Body
    );
    console.log("Is a Greeting Prompt==>", isGreetingPrompt);
    if (isGreetingPrompt == "true" || isGreetingPrompt.includes("true")) {
      // remove existing session
      deleteSession(req?.body?.From);
    }

    // Diffrentiate between transactional request and normal request
    const responseFromAI = await getAiReponseFromPrompt(
      prefix_prompt_group.aiReponseFromUserPrompt,
      req?.body?.Body
    );
    console.log("Response from AI==>", responseFromAI);

    // Detect OTP is sent
    // const existingSession = getSession(req?.body?.From);
    // console.log("Existing Session==>", existingSession);
    // const isOTPSent = await getAiReponseFromPrompt(
    //   prefix_prompt_group.aiDetectOTPSent,
    //   JSON.stringify(existingSession || "")
    // );
    // console.log("Is OTP Sent==>", isOTPSent);
    // if (isOTPSent == "false" || isOTPSent.includes("false")) {
    //   const otpSentMessage = await getAiReponseFromPrompt(
    //     prefix_prompt_group.aiCreateOTPSentMessage,
    //     ""
    //   );
    //   await sendResponseToWhatsapp({
    //     body: otpSentMessage,
    //     receiver: req.body.From.split(":")[1]
    //   });
    //   return res.send("Message sent!");
    // }

    // transactional query
    if (responseFromAI.includes("make_beckn_call")) {
      let aiResponseForBecknCall: any = {};

      // detect json response for make_beckn_call
      if (responseFromAI.startsWith("```")) {
        aiResponseForBecknCall = responseFromAI
          .split("```")[1]
          .split("json")[1];
      }
      aiResponseForBecknCall = JSON.parse(aiResponseForBecknCall);

      if (aiResponseForBecknCall.action == "search") {
        const session = getSession(req?.body?.From);
        console.log("Existing Session==>", session);
        if (
          !session ||
          session.chats[session.chats.length - 1].action ==
            BECKN_ACTIONS.confirm
        ) {
          // last session complete fresh signup required
          deleteSession(req?.body?.From);
          createSession(req.body.From);
          const signUpMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiSignupAsk,
            ""
          );

          console.log("Sign Up Message==>", signUpMessage);
          const session = getSession(req?.body?.From);
          session.chats.push({
            role: "model",
            text: signUpMessage,
            message_id: "",
            json: "",
            action: PROFILE_ACTIONS.SIGNUP
          });
          updateSession(req?.body?.From, session);
          await sendResponseToWhatsapp({
            body: signUpMessage,
            receiver: req.body.From.split(":")[1]
          });
          console.log(getSession(req?.body?.From));
          return res.send("Message sent!");
        } else {
        }
      }
      const searchOpenNetworkMSG = await getAiReponseFromPrompt(
        prefix_prompt_group.aiSearchingOnOpenNetwork,
        ""
      );
      await sendResponseToWhatsapp({
        body: searchOpenNetworkMSG,
        receiver: req.body.From.split(":")[1]
      });
      const data = await makeBecknCall(BECKN_ACTIONS.search, {});
      console.log("Beckn Call Data---->", data);
      const formatedReponse = await getAiReponseFromPrompt(
        prefix_prompt_group.aiListOfSearchItem,
        JSON.stringify(data)
      );
      await sendResponseToWhatsapp({
        body: formatedReponse,
        receiver: req.body.From.split(":")[1]
      });
    } else {
      await sendResponseToWhatsapp({
        body: responseFromAI,
        receiver: req.body.From.split(":")[1]
      });
    }

    return res.send("Message sent!");
  } catch (err: any) {
    console.log("here", err);
  }
};
