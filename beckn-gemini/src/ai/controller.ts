import { NextFunction, Request, Response } from "express";

import axios from "axios";
import { sendResponseToWhatsapp } from "../twilio/services";
import { getAiReponse } from "./services";

export const webhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("body", req.body);

    if (req?.body?.MediaUrl0) {
      const data = await axios.get(req?.body?.MediaUrl0, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SSID as string,
          password: process.env.TWILIO_API_TOKEN as string
        }
      });
      console.log(data.data);
    }
    const responseFromAI = await getAiReponse(req?.body?.Body);
    console.log("resp", responseFromAI);
    await sendResponseToWhatsapp({
      body: responseFromAI || "Sorry",
      receiver: req.body.From.split(":")[1]
    });

    return res.send("Message sent!");
  } catch (err: any) {
    console.log("here", err);
  }
};
