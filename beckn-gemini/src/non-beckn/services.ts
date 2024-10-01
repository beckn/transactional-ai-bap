import dotenv from "dotenv";
import axios from "axios";
import { BECKN_ACTIONS, prefix_prompt_group } from "../constant";
import { createBecknSearchPayload } from "../utils/beckn-utils";
import { sendResponseToWhatsapp } from "../twilio/services";
import { getAiReponseFromPrompt } from "../ai/services";
dotenv.config();

export const saveEnergyRequest = async (payload_parameter: {
  phone: string;
  unit: number;
  start_date: string;
  end_date: string;
}) => {
  try {
    console.log("Saving Energy Request===>", payload_parameter);
    const { phone, unit, start_date, end_date } = payload_parameter;
    const payload = {
      phone,
      unit,
      start_date,
      end_date
    };
    const url = `${process.env.P2P_PLUGIN_URL}/catalogue/add-entry`;
    const response = await axios.post(url, payload);
    //JUST For Testing Purpose, whatsapp msg will be sent from its caller function
    //Once AI layer is working, remove the send whatsapp message block
    if (response.data) {
      //send whatsapp message
      //get message from AI
      const body = "I have done that. I will inform you once it has been sold.";
      // await sendResponseToWhatsapp({
      //     body,
      //     receiver: phone
      // });
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
    const { phone, unitAvailable, unitsold, amount } = payload_parameter;
    let body;
    if (unitAvailable - unitsold <= 0) {
      body = `Congratulations!! All units you have listed has been sold. You have made ₹${amount} from this transaction.`;
    } else {
      body = `Congratulations!! your ${unitsold} unit of energy has been sold. You have made ₹${amount} from this transaction.`;
    }
    const successSaleMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSuccessSaleMessage,
      body
    );
    console.log("Success Sale Message===>", successSaleMessage);
    await sendResponseToWhatsapp({
      body: successSaleMessage,
      receiver: `+91${phone}`
    });
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};
