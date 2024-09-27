import dotenv from "dotenv";
import axios from "axios";
import { BECKN_ACTIONS } from "../constant";
import { createBecknSearchPayload } from "../utils/beckn-utils";
import { sendResponseToWhatsapp } from "../twilio/services";
dotenv.config();

export const saveEnergyRequest = async (
  payload_parameter: any //define it
) => {
  try {
    const { phone, unit, start_date, end_date } = payload_parameter;
    const payload = {
        phone,
        unit,
        start_date,
        end_date
    }
    const url = `${process.env.P2P_PLUGIN_URL}/catalogue`;
    const response = await axios.post(url, payload);
    //JUST For Testing Purpose, whatsapp msg will be sent from its caller function
    //Once AI layer is working, remove the send whatsapp message block
    if(response.data) {
        //send whatsapp message
        //get message from AI
        const body = 'I have done that. I will inform you once it has been sold.'
        await sendResponseToWhatsapp({
            body,
            receiver: phone
        });
    }
    return response.data;
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};

export const soldEnergy = async (
    payload_parameter: any //define it
  ) => {
    try {
      
      const { phone, unitAvailable, unitListed, unitSold, amount } = payload_parameter;
        let body;
        if(unitAvailable === 0) {
            body = `Congratulations!! All ${unitListed} units you have listed has been sold. You have made ${amount} Rs from this transaction.`
        } else {
            body = `Congratulations!! your ${unitSold} unit of energy out of ${unitListed} units you have listed has been sold. You have made ${amount} Rs from this transaction.`
        }     
        await sendResponseToWhatsapp({
            body,
            receiver: phone
        });
    } catch (err: any) {
      console.log(err);
      throw new Error(err.message);
    }
  };
  
