import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();
const client = twilio(
  process.env.TWILIO_ACCOUNT_SSID,
  process.env.TWILIO_API_TOKEN
);

export const sendResponseToWhatsapp = async (payload: {
  body: string;
  receiver: string;
  media_url?: string;
}) => {
  try {
    let body = {
      body: payload.body,
      from: `whatsapp:${process.env.SENDERS_WHATSAPP}`,
      to: `whatsapp:${payload.receiver}`,
      ...(payload.media_url ? { mediaUrl: [`${payload.media_url}`] } : {})
    };
    let data = await client.messages.create(body);
    const status = await client.messages(data.sid).fetch();
    return status;
  } catch (err: any) {
    throw new Error(err.message);
  }
};
