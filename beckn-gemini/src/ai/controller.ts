import { NextFunction, Request, Response } from "express";

import axios from "axios";
import { sendResponseToWhatsapp } from "../twilio/services";
import {
  getAiReponseFromUserPrompt,
  getAiReponseGeneralContent
} from "./services";
import { makeBecknCall } from "../beckn/services";
import { BECKN_ACTIONS } from "../constant";

export const webhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Whatsapp Request-->", req.body);

    if (req?.body?.MediaUrl0) {
      const data = await axios.get(req?.body?.MediaUrl0, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SSID as string,
          password: process.env.TWILIO_API_TOKEN as string
        }
      });
      console.log(data.data);
    }
    const responseFromAI = await getAiReponseFromUserPrompt(req?.body?.Body);
    console.log(typeof responseFromAI);
    if (responseFromAI.includes("make_beckn_call")) {
      console.log("Making Beckn Call");
      await sendResponseToWhatsapp({
        body: "Searching on Open Network Please wait.....",
        receiver: req.body.From.split(":")[1]
      });
      const data = await makeBecknCall(BECKN_ACTIONS.search, {});
      console.log("Beckn Call Data---->", data);
      const formatedReponse = await getAiReponseGeneralContent(
        JSON.stringify(data)
      );
      await sendResponseToWhatsapp({
        body: formatedReponse,
        receiver: req.body.From.split(":")[1]
      });
    } else {
      console.log("Response from AI--->", responseFromAI);
      await sendResponseToWhatsapp({
        body: responseFromAI || "Sorry!! I am not that much smart",
        receiver: req.body.From.split(":")[1]
      });
    }

    return res.send("Message sent!");
  } catch (err: any) {
    console.log("here", err);
  }
};
