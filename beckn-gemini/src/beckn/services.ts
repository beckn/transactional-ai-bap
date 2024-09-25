import dotenv from "dotenv";
import axios from "axios";
import { BECKN_ACTIONS } from "../constant";
import { createBecknSearchPayload } from "../utils/beckn-utils";
dotenv.config();

export const makeBecknCall = async (
  action: BECKN_ACTIONS,
  payload_parameter: any
) => {
  try {
    let payload: any;
    let url = process.env.BAP_CLIENT_URI as string;
    switch (action) {
      case BECKN_ACTIONS.search:
        payload = createBecknSearchPayload();
        url = `${url}/${BECKN_ACTIONS.search}`;
        break;
      case BECKN_ACTIONS.select:
        payload = {};
        url = `${url}/${BECKN_ACTIONS.select}`;
        break;
      default:
        payload = {};
        url = `${url}/${BECKN_ACTIONS.search}`;
        break;
    }
    const response = await axios.post(url as string, payload);
    return response.data;
  } catch (err: any) {
    console.log(err);
    throw new Error(err.message);
  }
};
