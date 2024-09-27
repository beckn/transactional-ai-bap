import { NextFunction, Request, Response } from "express";

import axios from "axios";
import { TextEncoder } from "util";
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
import { consumerFlow, presumerFlow } from "./flows";

export const webhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("**********************************************");
    console.log("Whatsapp Request Received from", req.body.From);
    const session = getSession(req?.body?.From);
    let flow: string = "general";
    // For Image Processing Code Modification Required
    if (req?.body?.MediaUrl0) {
      const data = await axios.get(req?.body?.MediaUrl0, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SSID as string,
          password: process.env.TWILIO_API_TOKEN as string
        }
      });
      console.log("data received---->", data);
      const encodedData = new TextEncoder().encode(data.data);

      console.log(encodedData);

      await sendResponseToWhatsapp({
        body: "content",
        receiver: req.body.From.split(":")[1]
      });

      return res.send("message sent");
    }

    // Flow Starts here

    // Detect Greeting message
    const isGreetingPrompt = await getAiReponseFromPrompt(
      prefix_prompt_group.aiDetectGreeting,
      req?.body?.Body
    );

    if (isGreetingPrompt == "true" || isGreetingPrompt.includes("true")) {
      console.log("Is a Greeting Prompt==>", isGreetingPrompt);
      // remove existing session
      deleteSession(req?.body?.From);
      flow = "general";
    }

    // Diffrentiate between transactional request and normal request
    let decisionFromAI = await getAiReponseFromPrompt(
      prefix_prompt_group.aiReponseFromUserPrompt,
      req?.body?.Body
    );

    if (decisionFromAI.includes("'flow':'consumer'")) {
      flow = "consumer";
    }
    if (decisionFromAI.includes("'flow':'presumer'")) {
      flow = "presumer";
    }

    // if(session && session.chats[session.chats.length-1].action === PROFILE_ACTIONS.SIGNUP){
    //   flow = "consumer"

    // }

    if (flow === "consumer") {
      // Consumer Flow i.e. Beckn Flow
      return await consumerFlow(req?.body?.From, req?.body?.Body, res);
    }

    if (flow === "presumer") {
      // Presumer Flow i.e. Strapi API Flow
      return await presumerFlow(req?.body?.From, req?.body?.Body, res);
    }

    console.log("Response from AI==>", decisionFromAI);

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
    if (decisionFromAI.includes("make_beckn_call")) {
      let aiResponseForBecknCall: any = {};

      // detect json response for make_beckn_call
      if (decisionFromAI.startsWith("```")) {
        aiResponseForBecknCall = decisionFromAI
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
        body: decisionFromAI,
        receiver: req.body.From.split(":")[1]
      });
    }

    return res.send("Message sent!");
  } catch (err: any) {
    console.log("here", err);
  }
};
