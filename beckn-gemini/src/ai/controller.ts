import { NextFunction, Request, Response } from "express";
import { sendResponseToWhatsapp } from "../twilio/services";
import {
  createSession,
  deleteSession,
  getAiReponseFromPrompt,
  getSession,
  imageRecognition,
  updateSession
} from "./services";
import { makeBecknCall } from "../beckn/services";
import {
  BECKN_ACTIONS,
  prefix_prompt_group,
  CONSUMER_ACTIONS,
  messages,
  PRESUMER_ACTIONS,
  DISCONTINUITY
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

    // Flow Starts here
    let isGreetingPrompt: string = "false";
    if (
      session &&
      session.chats.length &&
      session.chats[session.chats.length - 1].action ===
        CONSUMER_ACTIONS.UPLOAD_BILL
    ) {
      flow = "consumer";

      if (!req?.body?.MediaUrl0) {
        session.chats.push({
          role: "model",
          text: "",
          message_id: "",
          json: "",
          action: DISCONTINUITY.FLOW_BREAK,
          flow: "consumer"
        });
        updateSession(req?.body?.From, session);
      }
    } else {
      // Detect Greeting message
      isGreetingPrompt = await getAiReponseFromPrompt(
        prefix_prompt_group.aiDetectGreeting,
        req?.body?.Body
      );

      if (isGreetingPrompt == "true" || isGreetingPrompt.includes("true")) {
        console.log("Is a Greeting Prompt==>", isGreetingPrompt);
        // remove existing session
        deleteSession(req?.body?.From);
        flow = "general";
      }
    }

    let decisionFromAI = await getAiReponseFromPrompt(
      prefix_prompt_group.aiReponseFromUserPrompt,
      req?.body?.Body
    );
    console.log("Decision/Response from AI===>", decisionFromAI);
    if (isGreetingPrompt == "true" || isGreetingPrompt.includes("true")) {
      await sendResponseToWhatsapp({
        body: decisionFromAI,
        receiver: req.body.From.split(":")[1]
      });

      return res.send("Message sent!");
    }

    if (
      session &&
      session.chats.length &&
      ([
        CONSUMER_ACTIONS.SIGNUP,
        CONSUMER_ACTIONS.UPLOAD_BILL,
        CONSUMER_ACTIONS.OTP_SENT,
        CONSUMER_ACTIONS.VERIFY_OTP,
        BECKN_ACTIONS.search,
        BECKN_ACTIONS.select,
        BECKN_ACTIONS.init,
        BECKN_ACTIONS.confirm,
        BECKN_ACTIONS.status
      ].includes(session.chats[session.chats.length - 1].action) ||
        ([
          DISCONTINUITY.FLOW_BREAK,
          DISCONTINUITY.FLOW_BREAK_CONFIRMATION
        ].includes(session.chats[session.chats.length - 1].action) &&
          session.chats[session.chats.length - 1].flow === "consumer"))
    ) {
      flow = "consumer";
    }

    if (
      session &&
      session.chats.length &&
      ([
        PRESUMER_ACTIONS.SELL_INTENT,
        PRESUMER_ACTIONS.UPLOAD_CATALOG,
        PRESUMER_ACTIONS.UPLOAD_CATALOG_CONFIRMATION,
        PRESUMER_ACTIONS.RECURING_UPLOAD,
        PRESUMER_ACTIONS.RECURING_UPLOAD_CONFIRMATION
      ].includes(session.chats[session.chats.length - 1].action) ||
        ([
          DISCONTINUITY.FLOW_BREAK,
          DISCONTINUITY.FLOW_BREAK_CONFIRMATION
        ].includes(session.chats[session.chats.length - 1].action) &&
          session.chats[session.chats.length - 1].flow === "presumer"))
    ) {
      flow = "presumer";
    }

    // Diffrentiate between transactional request and normal request

    if (decisionFromAI.includes("'flow':'consumer'")) {
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].flow === "presumer"
      ) {
        flow = "presumer";
      } else {
        flow = "consumer";
      }
      flow = "consumer";
    } else if (
      decisionFromAI.includes("'flow':'presumer'") ||
      decisionFromAI.includes("'flow': 'presumer'")
    ) {
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].flow === "consumer"
      ) {
        flow = "consumer";
      } else {
        flow = "presumer";
      }
    }

    if (flow === "consumer") {
      // Consumer Flow i.e. Beckn Flow
      return await consumerFlow(
        req?.body?.From,
        req?.body?.Body,
        res,
        req?.body
      );
    }

    if (flow === "presumer") {
      // Presumer Flow i.e. Strapi API Flow
      return await presumerFlow(req?.body?.From, req?.body?.Body, res);
    }

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
    // if (decisionFromAI.includes("make_beckn_call")) {
    //   let aiResponseForBecknCall: any = {};

    //   // detect json response for make_beckn_call
    //   if (decisionFromAI.startsWith("```")) {
    //     aiResponseForBecknCall = decisionFromAI
    //       .split("```")[1]
    //       .split("json")[1];
    //   }
    //   aiResponseForBecknCall = JSON.parse(aiResponseForBecknCall);

    //   if (aiResponseForBecknCall.action == "search") {
    //     const session = getSession(req?.body?.From);
    //     console.log("Existing Session==>", session);
    //     if (
    //       !session ||
    //       session.chats[session.chats.length - 1].action ==
    //         BECKN_ACTIONS.confirm
    //     ) {
    //       // last session complete fresh signup required
    //       deleteSession(req?.body?.From);
    //       createSession(req.body.From);
    //       const signUpMessage = await getAiReponseFromPrompt(
    //         prefix_prompt_group.aiSignupAsk,
    //         ""
    //       );

    //       console.log("Sign Up Message==>", signUpMessage);
    //       const session = getSession(req?.body?.From);
    //       session.chats.push({
    //         role: "model",
    //         text: signUpMessage,
    //         message_id: "",
    //         json: "",
    //         action: CONSUMER_ACTIONS.SIGNUP
    //       });
    //       updateSession(req?.body?.From, session);
    //       await sendResponseToWhatsapp({
    //         body: signUpMessage,
    //         receiver: req.body.From.split(":")[1]
    //       });
    //       console.log(getSession(req?.body?.From));
    //       return res.send("Message sent!");
    //     } else {
    //     }
    //   }
    //   const searchOpenNetworkMSG = await getAiReponseFromPrompt(
    //     prefix_prompt_group.aiSearchingOnOpenNetwork,
    //     ""
    //   );
    //   await sendResponseToWhatsapp({
    //     body: searchOpenNetworkMSG,
    //     receiver: req.body.From.split(":")[1]
    //   });
    //   const data = await makeBecknCall(BECKN_ACTIONS.search, {});
    //   console.log("Beckn Call Data---->", data);
    //   const formatedReponse = await getAiReponseFromPrompt(
    //     prefix_prompt_group.aiListOfSearchItem,
    //     JSON.stringify(data)
    //   );
    //   await sendResponseToWhatsapp({
    //     body: formatedReponse,
    //     receiver: req.body.From.split(":")[1]
    //   });
    // } else {
    await sendResponseToWhatsapp({
      body: decisionFromAI,
      receiver: req.body.From.split(":")[1]
    });
    // }

    return res.send("Message sent!");
  } catch (err: any) {
    console.log("here", err);
    await sendResponseToWhatsapp({
      body: messages.APPOLOGY_MESSAGE,
      receiver: req.body.From.split(":")[1]
    });
  }
};
