import dotenv from "dotenv";
import axios from "axios";
import { BECKN_ACTIONS, IKeyValuePair } from "../constant";
import {
  createBecknConfirmPayload,
  createBecknInitPayload,
  createBecknSearchPayload,
  createBecknSelectPayload
} from "../utils/beckn-utils";
dotenv.config();

export const makeBecknCall = async (
  action: BECKN_ACTIONS,
  payload_parameter: IKeyValuePair
) => {
  try {
    let payload: any;
    let url = process.env.BAP_CLIENT_URI as string;
    switch (action) {
      case BECKN_ACTIONS.search:
        payload = createBecknSearchPayload(`${payload_parameter.units}`);
        url = `${url}/${BECKN_ACTIONS.search}`;
        break;
      case BECKN_ACTIONS.select:
        payload = createBecknSelectPayload(
          payload_parameter.on_search,
          `${payload_parameter.units}`
        );
        url = `${url}/${BECKN_ACTIONS.select}`;
        break;
      case BECKN_ACTIONS.init:
        payload = createBecknInitPayload(
          payload_parameter.on_select,
          `${payload_parameter.units}`,
          payload_parameter.phone
        );
        url = `${url}/${BECKN_ACTIONS.init}`;
        break;

      case BECKN_ACTIONS.confirm:
        payload = createBecknConfirmPayload(
          payload_parameter.on_select,
          `${payload_parameter.units}`,
          payload_parameter.phone
        );
        url = `${url}/${BECKN_ACTIONS.confirm}`;
        break;
      default:
        payload = {};
        url = `${url}/${BECKN_ACTIONS.search}`;
        break;
    }
    console.log("Beckn Payload--->", JSON.stringify(payload));
    const response = await axios.post(url as string, payload);
    return response.data;
  } catch (err: any) {
    console.error("Beckn API Error:", {
      status: err.response?.status,
      message: err.message,
      data: err.response?.data
    });
    throw new Error(err.message);
  }
};
