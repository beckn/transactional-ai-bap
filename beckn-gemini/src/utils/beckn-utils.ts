import dotenv from "dotenv";
import { v4 as uuidV4 } from "uuid";
dotenv.config();

export const createBecknContext = () => {
  return {
    domain: process.env.DOMAIN as string,
    action: "search",
    version: "1.1.0",
    bap_uri: process.env.BAP_URI as string,
    bap_id: process.env.BAP_ID as string,
    message_id: uuidV4(),
    transaction_id: uuidV4(),
    timestamp: new Date().toISOString()
  };
};

export const createBecknSearchPayload = () => {
  const tomorrowStartTimestamp = new Date();
  tomorrowStartTimestamp.setDate(tomorrowStartTimestamp.getDate() + 1);
  tomorrowStartTimestamp.setHours(10, 0, 0, 0);

  const tomorrowEndTimeStamp = new Date();
  tomorrowEndTimeStamp.setDate(tomorrowEndTimeStamp.getDate() + 1);
  tomorrowEndTimeStamp.setHours(17, 0, 0, 0);
  return {
    context: createBecknContext(),
    message: {
      item: {
        quantity: {
          available: {
            measure: {
              value: "1000.0",
              unit: "kWH"
            }
          }
        }
      },
      fulfillment: {
        stops: [
          {
            time: {
              range: {
                start: tomorrowStartTimestamp.toISOString(),
                end: tomorrowEndTimeStamp.toISOString()
              }
            }
          }
        ]
      }
    }
  };
};
