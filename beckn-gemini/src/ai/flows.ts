import { Response } from "express";
import { makeBecknCall } from "../beckn/services";
import {
  prefix_prompt_group,
  CONSUMER_ACTIONS,
  BECKN_ACTIONS
} from "../constant";
import { sendResponseToWhatsapp } from "../twilio/services";
import { createQuote } from "../utils/quote-utils";
import {
  createSession,
  deleteSession,
  getAiReponseFromPrompt,
  getSession,
  updateSession
} from "./services";

export const consumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  try {
    console.log("\n===>Consumer Flow Called<===\n");
    let session = getSession(whatsappNumber);
    if (!session) {
      createSession(whatsappNumber);
      session = getSession(whatsappNumber);
    }
    if (!session.chats.length) {
      // Fresh Entry Upload Bill Message

      const uploadBillMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiUploadBill,
        ""
      );

      console.log("Upload Bill Message==>", uploadBillMessage);
      session.chats.push({
        role: "model",
        text: uploadBillMessage,
        message_id: "",
        json: "",
        action: CONSUMER_ACTIONS.UPLOAD_BILL,
        flow: "consumer"
      });

      updateSession(whatsappNumber, session);
      await sendResponseToWhatsapp({
        body: uploadBillMessage,
        receiver: whatsappNumber.split(":")[1]
      });
      console.log("Session Content===>", getSession(whatsappNumber));
      return res.send("message");
    } else {
      // Send Signup Message
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
          CONSUMER_ACTIONS.UPLOAD_BILL
      ) {
        const signUpMessage = await getAiReponseFromPrompt(
          prefix_prompt_group.aiSignupAsk,
          ""
        );
        console.log("Sign Up Message==>", signUpMessage);
        session.chats.push({
          role: "model",
          text: signUpMessage,
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.SIGNUP,
          flow: "consumer"
        });
        updateSession(whatsappNumber, session);
        await sendResponseToWhatsapp({
          body: signUpMessage,
          receiver: whatsappNumber.split(":")[1]
        });
        console.log("Session Content===>", getSession(whatsappNumber));
        return res.send("message");
      }

      // Send OTP
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
          CONSUMER_ACTIONS.SIGNUP
      ) {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          userMessage
        );
        console.log(userAcceptance);
        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          const otpSentMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiSendOTPMessage,
            ""
          );
          console.log("OTP sent Message===>", otpSentMessage);
          session.chats.push({
            role: "model",
            text: otpSentMessage,
            message_id: "",
            json: "",
            action: CONSUMER_ACTIONS.OTP_SENT,
            flow: "consumer"
          });
          updateSession(whatsappNumber, session);
          await sendResponseToWhatsapp({
            body: otpSentMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          console.log("Session Content===>", getSession(whatsappNumber));
          return res.send("message");
        }
      }

      // Verify OTP
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
          CONSUMER_ACTIONS.OTP_SENT
      ) {
        const detectOTP = await getAiReponseFromPrompt(
          prefix_prompt_group.aiDetectOTP,
          userMessage
        );
        console.log("Detect OTP===>", detectOTP);
        if (detectOTP.includes("true")) {
          const validOtpMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiValidOTP,
            ""
          );

          let usageProfileDetails: any = await getAiReponseFromPrompt(
            prefix_prompt_group.aiUsageProfileDetails,
            ""
          );

          if (usageProfileDetails.startsWith("```")) {
            usageProfileDetails = JSON.parse(
              usageProfileDetails.split("```")[1].split("json")[1]
            );
          }

          await sendResponseToWhatsapp({
            body: validOtpMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          await sendResponseToWhatsapp({
            body: usageProfileDetails?.message || usageProfileDetails,
            receiver: whatsappNumber.split(":")[1]
          });

          session.chats.push({
            role: "model",
            text: validOtpMessage,
            message_id: "",
            json: JSON.stringify(usageProfileDetails),
            action: CONSUMER_ACTIONS.VERIFY_OTP,
            flow: "consumer"
          });
          updateSession(whatsappNumber, session);

          console.log("Session Content===>", getSession(whatsappNumber));
          return res.send("message");
        } else {
          const invalidOTPMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiInvalidOTP,
            ""
          );
          console.log("Invalid OTP Message===>", invalidOTPMessage);
          await sendResponseToWhatsapp({
            body: invalidOTPMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          console.log("Session Content===>", getSession(whatsappNumber));
          return res.send("message");
        }
      }

      // Search Intent and Search Call
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
          CONSUMER_ACTIONS.VERIFY_OTP
      ) {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          userMessage
        );
        console.log("User Acceptance===>", userAcceptance);
        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          let searchIntentMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiSearchIntent,
            ""
          );
          console.log("Search Intent Message===>", searchIntentMessage);

          await sendResponseToWhatsapp({
            body: searchIntentMessage,
            receiver: whatsappNumber.split(":")[1]
          });

          const verifyOTPStep = session.chats.find(
            (chat: any) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
          );
          if (verifyOTPStep) {
            const units = JSON.parse(verifyOTPStep.json).units;
            // Make Beckn Search Call
            const becknSearchResponse = await makeBecknCall(
              BECKN_ACTIONS.search,
              {
                units
              }
            );
            console.log(
              "Beckn ON Search===>",
              JSON.stringify(becknSearchResponse)
            );
            let becknOnSearchMessage = await getAiReponseFromPrompt(
              prefix_prompt_group.aiBecknOnSearch,
              JSON.stringify({ becknSearchResponse, units })
            );

            session.chats.push({
              role: "model",
              text: becknOnSearchMessage,
              message_id: "",
              json: JSON.stringify(becknSearchResponse),
              action: BECKN_ACTIONS.search,
              flow: "consumer"
            });
            updateSession(whatsappNumber, session);
            await sendResponseToWhatsapp({
              body: becknOnSearchMessage,
              receiver: whatsappNumber.split(":")[1]
            });
            console.log("Session Content===>", getSession(whatsappNumber));
          }

          return res.send("message");
        }
      }

      // Make Beckn Select Call
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action === BECKN_ACTIONS.search
      ) {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          userMessage
        );
        console.log("User Acceptance===>", userAcceptance);
        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          const units = JSON.parse(
            session.chats.find(
              (chat: any) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
            ).json
          ).units;
          let selectIntentMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiSelectIntent,
            `${units} units`
          );
          console.log("Select Intent Message===>", selectIntentMessage);

          await sendResponseToWhatsapp({
            body: selectIntentMessage,
            receiver: whatsappNumber.split(":")[1]
          });

          const searchStep = session.chats.find(
            (chat: any) => chat.action === BECKN_ACTIONS.search
          );
          const verifyOTPStep = session.chats.find(
            (chat: any) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
          );
          if (searchStep) {
            const units = JSON.parse(verifyOTPStep.json).units;
            // Make Beckn Select Call
            const becknSelectResponse = await makeBecknCall(
              BECKN_ACTIONS.select,
              {
                on_search: JSON.parse(searchStep.json),
                units
              }
            );
            console.log(
              "Beckn ON Select===>",
              JSON.stringify(becknSelectResponse)
            );

            const createdQuote = createQuote(
              becknSelectResponse.responses[0]?.message?.order?.quote,
              units
            );

            console.log("\n\nCreated Quote===>", JSON.stringify(createdQuote));

            let beautifyQuoteMessage = await getAiReponseFromPrompt(
              prefix_prompt_group.aiBeautifyQuote,
              JSON.stringify(createdQuote)
            );
            await sendResponseToWhatsapp({
              body: beautifyQuoteMessage,
              receiver: whatsappNumber.split(":")[1]
            });

            session.chats.push({
              role: "model",
              text: selectIntentMessage,
              message_id: "",
              json: JSON.stringify(becknSelectResponse),
              action: BECKN_ACTIONS.select,
              flow: "consumer"
            });
            updateSession(whatsappNumber, session);

            console.log("Session Content===>", getSession(whatsappNumber));
          }

          return res.send("message");
        }
      }

      // Make Beckn Init and Confirm Call
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action === BECKN_ACTIONS.select
      ) {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          userMessage
        );
        console.log("User Acceptance===>", userAcceptance);
        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          const selectStep = session.chats.find(
            (chat: any) => chat.action === BECKN_ACTIONS.select
          );
          const verifyOTPStep = session.chats.find(
            (chat: any) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
          );
          if (selectStep) {
            const units = JSON.parse(verifyOTPStep.json).units;
            // Make Beckn Init Call
            const becknInitResponse = await makeBecknCall(BECKN_ACTIONS.init, {
              on_select: JSON.parse(selectStep.json),
              units,
              phone: whatsappNumber.split(":")[1].split("+91")[1]
            });
            console.log("Beckn ON Init===>", JSON.stringify(becknInitResponse));

            const onInitMessage = await getAiReponseFromPrompt(
              prefix_prompt_group.aiBecknOnInit,
              JSON.stringify({ becknInitResponse })
            );

            console.log("On Init Message====>", onInitMessage);
            session.chats.push({
              role: "model",
              text: onInitMessage,
              message_id: "",
              json: JSON.stringify(becknInitResponse),
              action: BECKN_ACTIONS.init,
              flow: "consumer"
            });
            updateSession(whatsappNumber, session);
            await sendResponseToWhatsapp({
              body: onInitMessage,
              receiver: whatsappNumber.split(":")[1]
            });

            // Create QR Code and sent to whatsapp
            // ________

            // Make Beckn Confirm Call
            const becknConfirmResponse = await makeBecknCall(
              BECKN_ACTIONS.confirm,
              {
                on_select: JSON.parse(selectStep.json),
                units,
                phone: whatsappNumber.split(":")[1].split("+91")[1]
              }
            );
            console.log(
              "Beckn ON Confirm===>",
              JSON.stringify(becknInitResponse)
            );

            const onConfirmMessage = await getAiReponseFromPrompt(
              prefix_prompt_group.aiBecknOnConfirm,
              JSON.stringify({ becknConfirmResponse, units })
            );

            console.log("On Cofirm Message===>", onConfirmMessage);

            session.chats.push({
              role: "model",
              text: "selectIntentMessage",
              message_id: "",
              json: JSON.stringify(becknInitResponse),
              action: BECKN_ACTIONS.confirm,
              flow: "consumer"
            });
            updateSession(whatsappNumber, session);

            await sendResponseToWhatsapp({
              body: onConfirmMessage,
              receiver: whatsappNumber.split(":")[1]
            });
            console.log("Session Content===>", getSession(whatsappNumber));
          }

          return res.send("message");
        }
      }

      // Ask Recurring purchase and clease the session
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action === BECKN_ACTIONS.confirm
      ) {
        const recurringPurchaseMessage = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckRecurrignPurchaseAcceptance,
          userMessage
        );
        console.log(
          "User Recurring Purchase Acceptance===>",
          recurringPurchaseMessage
        );
        await sendResponseToWhatsapp({
          body: recurringPurchaseMessage,
          receiver: whatsappNumber.split(":")[1]
        });
        deleteSession(whatsappNumber);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const presumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  console.log("Presumer Flow Called");
  await sendResponseToWhatsapp({
    body: "Presumer Flow Called",
    receiver: whatsappNumber.split(":")[1]
  });
  return res.send("message sent");
};

export const generalFlow = async () => {};
