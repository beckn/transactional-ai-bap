import { NextFunction, Request, Response } from "express";

import axios from "axios";
import { sendResponseToWhatsapp } from "../twilio/services";
import { makeBecknCall } from "../beckn/services";
import { BECKN_ACTIONS } from "../constant";
import { soldEnergy } from "./services";

export const energySoldController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("energySoldController Request-->", req.body);
    await soldEnergy(req.body);
    return res.send("Message sent!");
  } catch (err: any) {
    console.log("here", err);
  }
};
