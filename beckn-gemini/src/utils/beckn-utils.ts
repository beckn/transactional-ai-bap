import dotenv from "dotenv";
import { v4 as uuidV4 } from "uuid";
import { BECKN_ACTIONS } from "../constant";
dotenv.config();

export const createBecknContext = (
  action: BECKN_ACTIONS,
  bpp_id?: string,
  bpp_uri?: string
) => {
  return {
    domain: process.env.DOMAIN as string,
    action: action,
    version: "1.1.0",
    bap_uri: process.env.BAP_URI as string,
    bap_id: process.env.BAP_ID as string,
    message_id: uuidV4(),
    transaction_id: uuidV4(),
    timestamp: new Date().toISOString(),
    ...(bpp_id && bpp_id.length ? { bpp_id: bpp_id } : {}),
    ...(bpp_uri && bpp_uri.length ? { bpp_uri: bpp_uri } : {})
  };
};

export const createBecknSearchPayload = (units: string) => {
  const tomorrowStartTimestamp = new Date();
  tomorrowStartTimestamp.setDate(tomorrowStartTimestamp.getDate() + 1);
  tomorrowStartTimestamp.setHours(10, 0, 0, 0);

  const tomorrowEndTimeStamp = new Date();
  tomorrowEndTimeStamp.setDate(tomorrowEndTimeStamp.getDate() + 1);
  tomorrowEndTimeStamp.setHours(17, 0, 0, 0);

  // Generate a random Unit between 7 and 15
  const min = 7;
  const max = 15;

  const randomUnitValue = Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    context: createBecknContext(BECKN_ACTIONS.search),
    message: {
      intent: {
        item: {
          quantity: {
            available: {
              measure: {
                value: units || `${randomUnitValue}`,
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
                  start: "2024-10-04T10:00:00.000Z",
                  end: "2024-10-04T18:00:00.000Z"
                }
              }
            }
          ]
        }
      }
    }
  };
};

export const createBecknSelectPayload = (on_search: any, units: string) => {
  const tomorrowStartTimestamp = new Date();
  tomorrowStartTimestamp.setDate(tomorrowStartTimestamp.getDate() + 1);
  tomorrowStartTimestamp.setHours(10, 0, 0, 0);

  const tomorrowEndTimeStamp = new Date();
  tomorrowEndTimeStamp.setDate(tomorrowEndTimeStamp.getDate() + 1);
  tomorrowEndTimeStamp.setHours(17, 0, 0, 0);

  // Generate a random Unit between 7 and 15
  const min = 7;
  const max = 15;

  const randomUnitValue = Math.floor(Math.random() * (max - min + 1)) + min;

  const bpp_id = on_search?.responses[0]?.context.bpp_id || "";
  const bpp_uri = on_search?.responses[0]?.context.bpp_uri || "";
  const providerId =
    on_search?.responses[0]?.message?.catalog?.providers[0]?.id;
  const itemId =
    on_search?.responses[0]?.message?.catalog?.providers[0]?.items[0].id;
  return {
    context: createBecknContext(BECKN_ACTIONS.select, bpp_id, bpp_uri),
    message: {
      order: {
        provider: {
          id: providerId
        },
        items: [
          {
            id: itemId,
            quantity: {
              selected: {
                count: parseInt(units)
              }
            }
          }
        ],
        fulfillments: [
          {
            stops: [
              {
                time: {
                  range: {
                    start: "2024-10-04T10:00:00.000Z",
                    end: "2024-10-04T18:00:00.000Z"
                  }
                }
              }
            ]
          }
        ]
      }
    }
  };
};

export const createBecknInitPayload = (
  on_select: any,
  units: string,
  phone: string
) => {
  const bpp_id = on_select?.responses[0]?.context.bpp_id || "";
  const bpp_uri = on_select?.responses[0]?.context.bpp_uri || "";
  const providerId = on_select?.responses[0]?.message?.order?.providers?.id;
  const itemId = on_select?.responses[0]?.message?.order?.items[0].id;
  const fulfillmentId =
    on_select?.responses[0]?.message?.order?.items[0]?.fulfillment_ids[0] ||
    "1";
  return {
    context: createBecknContext(BECKN_ACTIONS.init, bpp_id, bpp_uri),
    message: {
      order: {
        provider: {
          id: providerId
        },
        items: [
          {
            id: itemId,
            quantity: {
              selected: {
                count: parseInt(units)
              }
            }
          }
        ],
        fulfillments: [
          {
            id: fulfillmentId,
            stops: [
              {
                time: {
                  range: {
                    start: "2024-10-04T10:00:00.000Z",
                    end: "2024-10-04T18:00:00.000Z"
                  }
                }
              }
            ]
          }
        ],
        billing: {
          phone: phone
        }
      }
    }
  };
};

export const createBecknConfirmPayload = (
  on_select: any,
  units: string,
  phone: string
) => {
  const bpp_id = on_select?.responses[0]?.context.bpp_id || "";
  const bpp_uri = on_select?.responses[0]?.context.bpp_uri || "";
  const providerId = on_select?.responses[0]?.message?.order?.providers?.id;
  const itemId = on_select?.responses[0]?.message?.order?.items[0].id;
  const fulfillmentId =
    on_select?.responses[0]?.message?.order?.items[0]?.fulfillment_ids[0] ||
    "1";
  return {
    context: createBecknContext(BECKN_ACTIONS.confirm, bpp_id, bpp_uri),
    message: {
      order: {
        provider: {
          id: providerId
        },
        items: [
          {
            id: itemId,
            quantity: {
              selected: {
                count: parseInt(units)
              }
            }
          }
        ],
        fulfillments: [
          {
            id: fulfillmentId,
            stops: [
              {
                time: {
                  range: {
                    start: "2024-10-04T10:00:00.000Z",
                    end: "2024-10-04T18:00:00.000Z"
                  }
                }
              }
            ]
          }
        ],
        billing: {
          phone: phone
        }
      }
    }
  };
};
