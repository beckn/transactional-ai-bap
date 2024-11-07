import { response, Response } from "express";
import { makeBecknCall } from "../beckn/services";
import {
  prefix_prompt_group,
  CONSUMER_ACTIONS,
  BECKN_ACTIONS,
  messages,
  PRESUMER_ACTIONS,
  DISCONTINUITY
} from "../constant";
import { saveEnergyRequest } from "../non-beckn/services";
import { sendResponseToWhatsapp } from "../twilio/services";
import { createQuote } from "../utils/quote-utils";
import {
  createSession,
  deleteSession,
  getAiReponseFromPrompt,
  getSession,
  imageRecognition,
  updateSession
} from "./services";
import dotenv from "dotenv";
import { generateQRCode } from "../utils/qr-code-utils";
dotenv.config();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const consumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response,
  whatsappReq?: any
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

      const sureHelpWithBuyingMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiSureHelpWithBuying,
        ""
      );
      console.log(
        "Sure Help With Buying Message===>",
        sureHelpWithBuyingMessage
      );
      await sendResponseToWhatsapp({
        body: sureHelpWithBuyingMessage,
        receiver: whatsappNumber.split(":")[1]
      });

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
        const imageProcessedData = await imageRecognition(
          whatsappReq.MediaUrl0
        );
        const imageProcessedMessage = await getAiReponseFromPrompt(
          prefix_prompt_group.aiImageProcessedMessage,
          imageProcessedData
        );
        if (imageProcessedMessage.includes("Not an electricity bill")) {
          const wrongImageMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiWrongImageMessage,
            imageProcessedData
          );
          await sendResponseToWhatsapp({
            body: wrongImageMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          return res.send("Message Sent");
        }
        await sendResponseToWhatsapp({
          body: imageProcessedMessage,
          receiver: whatsappNumber.split(":")[1]
        });
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
          const proceedWithP2PRegistrationMessage =
            await getAiReponseFromPrompt(
              prefix_prompt_group.aiProceedWithP2PRegistration,
              ""
            );
          console.log(
            "Proceed with P2P Registration Message===>",
            proceedWithP2PRegistrationMessage
          );
          await sendResponseToWhatsapp({
            body: proceedWithP2PRegistrationMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          await delay(1000);

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
        } else {
          session.chats.push({
            role: "model",
            text: "",
            message_id: "",
            json: "",
            action: DISCONTINUITY.FLOW_BREAK,
            flow: "consumer"
          });
          updateSession(whatsappNumber, session);
          session = getSession(whatsappNumber);
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
          const connectToUeiP2PMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiConnectToUeiP2P,
            ""
          );
          console.log("Connect To UEI P2P Message===>", connectToUeiP2PMessage);
          await sendResponseToWhatsapp({
            body: connectToUeiP2PMessage,
            receiver: whatsappNumber.split(":")[1]
          });

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
        } else {
          session.chats.push({
            role: "model",
            text: "",
            message_id: "",
            json: "",
            action: DISCONTINUITY.FLOW_BREAK,
            flow: "consumer"
          });
          updateSession(whatsappNumber, session);
          session = getSession(whatsappNumber);
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
        } else {
          session.chats.push({
            role: "model",
            text: "",
            message_id: "",
            json: "",
            action: DISCONTINUITY.FLOW_BREAK,
            flow: "consumer"
          });
          updateSession(whatsappNumber, session);
          session = getSession(whatsappNumber);
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

            generateQRCode();
            await sendResponseToWhatsapp({
              body: "",
              receiver: whatsappNumber.split(":")[1],
              media_url: `${process.env.AI_SERVER_URL}/static/qrcode.png`
            });

            await delay(30000);

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
        } else {
          session.chats.push({
            role: "model",
            text: "",
            message_id: "",
            json: "",
            action: DISCONTINUITY.FLOW_BREAK,
            flow: "consumer"
          });
          updateSession(whatsappNumber, session);
          session = getSession(whatsappNumber);
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

      // Ask Flow Break Confirmation
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
        DISCONTINUITY.FLOW_BREAK
      ) {
        const discontinueFlowMessage = await getAiReponseFromPrompt(
          prefix_prompt_group.aiDiscontinueFlowMessage,
          ""
        );
        console.log("Discontinue Flow Message===>", discontinueFlowMessage);
        session.chats.push({
          role: "model",
          text: discontinueFlowMessage,
          message_id: "",
          json: "",
          action: DISCONTINUITY.FLOW_BREAK_CONFIRMATION,
          flow: "consumer"
        });
        updateSession(whatsappNumber, session);
        await sendResponseToWhatsapp({
          body: discontinueFlowMessage,
          receiver: whatsappNumber.split(":")[1]
        });
        return res.send("Message sent");
      }

      // Send Session Cleared Confirmation and Clear the session if yes else roll back to previous state
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
        DISCONTINUITY.FLOW_BREAK_CONFIRMATION
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
          deleteSession(whatsappNumber);
          const discontinueFlowConfirmMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiDiscontinueFlowConfirmMessage,
            ""
          );
          console.log(
            "Discontinue Flow Confirm Message===>",
            discontinueFlowConfirmMessage
          );
          await sendResponseToWhatsapp({
            body: discontinueFlowConfirmMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          return res.send("Message sent");
        } else {
          console.log("Rolling back to previous step!!");
          session.chats.pop();
          session.chats.pop();
          updateSession(whatsappNumber, session);
          const rollBackToPrevStateMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiRollbackToPrevState,
            ""
          );
          console.log(
            "RollBack To Prev State Message===>",
            rollBackToPrevStateMessage
          );
          await sendResponseToWhatsapp({
            body: rollBackToPrevStateMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          return res.send("Message sent");
        }
      }
    }
  } catch (err) {
    console.log("Error===>", err);
    await sendResponseToWhatsapp({
      body: messages.APPOLOGY_MESSAGE,
      receiver: whatsappNumber.split(":")[1]
    });
    return res.send("Message sent");
  }
};

export const presumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  try {
    console.log("\n====>Presumer Flow Called<===\n");

    let session = getSession(whatsappNumber);
    if (!session) {
      createSession(whatsappNumber);
      session = getSession(whatsappNumber);
    }
    if (!session.chats.length) {
      // Fresh Entry
      const sureHelpWithSelling = await getAiReponseFromPrompt(
        prefix_prompt_group.aiSureHelpWithSelling,
        ""
      );
      console.log("Sure Help With Selling Message===>", sureHelpWithSelling);
      await sendResponseToWhatsapp({
        body: sureHelpWithSelling,
        receiver: whatsappNumber.split(":")[1]
      });
      const askSellDetails = await getAiReponseFromPrompt(
        prefix_prompt_group.aiUnitsToSell,
        ""
      );
      console.log("Ask Sell Details Message===>", askSellDetails);
      session.chats.push({
        role: "model",
        text: askSellDetails,
        message_id: "",
        json: "",
        action: PRESUMER_ACTIONS.SELL_INTENT,
        flow: "presumer"
      });
      updateSession(whatsappNumber, session);
      await sendResponseToWhatsapp({
        body: askSellDetails,
        receiver: whatsappNumber.split(":")[1]
      });
    } else {
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
        PRESUMER_ACTIONS.SELL_INTENT
      ) {
        // Send Upload Catalog Message
        let extractSellDetails = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckSellDetails,
          userMessage
        );
        console.log("Extracted Sell Details===>", extractSellDetails);
        if (
          extractSellDetails != "false" ||
          !extractSellDetails.includes("false")
        ) {
          if (extractSellDetails.startsWith("```")) {
            extractSellDetails = extractSellDetails
              .split("```")[1]
              .split("json")[1];
          }
          session.chats.push({
            role: "model",
            text: extractSellDetails,
            message_id: "",
            json: extractSellDetails,
            action: PRESUMER_ACTIONS.UPLOAD_CATALOG,
            flow: "presumer"
          });
          updateSession(whatsappNumber, session);
          const askCatalogListingMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiAskCatalogListing,
            ""
          );
          await sendResponseToWhatsapp({
            body: askCatalogListingMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          return res.send("message sent");
        } else {
          // Check Continuty of transaction
          session.chats.push({
            role: "model",
            text: "",
            message_id: "",
            json: "",
            action: DISCONTINUITY.FLOW_BREAK,
            flow: "presumer"
          });
          updateSession(whatsappNumber, session);
          session = getSession(whatsappNumber);
        }
      }
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
        PRESUMER_ACTIONS.UPLOAD_CATALOG
      ) {
        // Send Order Confirmtation Message
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          userMessage
        );
        console.log("User Acceptance Message===>", userAcceptance);
        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          const uploadCatalogStep = session.chats.find(
            (elem: any) => elem.action === PRESUMER_ACTIONS.UPLOAD_CATALOG
          );

          // Call Strapi API for placing order
          const uploadCatalogResponse = await saveEnergyRequest({
            phone: whatsappNumber.split("+91")[1],
            unit: Number(JSON.parse(uploadCatalogStep.json).units),
            start_date: "2024-10-04T10:00:00.000Z",
            end_date: "2024-10-04T18:00:00.000Z"
          });
          console.log(
            "Upload Catalog Response from BPP===>",
            uploadCatalogResponse
          );
          if (uploadCatalogResponse.status === "SUCCESS") {
            session.chats.push({
              role: "model",
              text: "",
              message_id: "",
              json: JSON.stringify({
                request: {
                  phone: whatsappNumber.split("+91")[1],
                  unit: Number(JSON.parse(uploadCatalogStep.json).units),
                  start_date: "2024-10-04T10:00:00.000Z",
                  end_date: "2024-10-04T18:00:00.000Z"
                },
                response: uploadCatalogResponse
              }),
              action: PRESUMER_ACTIONS.UPLOAD_CATALOG_CONFIRMATION,
              flow: "presumer"
            });
            updateSession(whatsappNumber, session);
            const successCatalogListingMessage = await getAiReponseFromPrompt(
              prefix_prompt_group.aiSuccessCatalogListing,
              ""
            );
            console.log(
              "Success Catalog Listing Message====>",
              successCatalogListingMessage
            );
            await sendResponseToWhatsapp({
              body: successCatalogListingMessage,
              receiver: whatsappNumber.split(":")[1]
            });
            deleteSession(whatsappNumber);
            return res.send("message sent");
          } else {
            const failCatalogListingMessage = await getAiReponseFromPrompt(
              prefix_prompt_group.aiFailCatalogListing,
              uploadCatalogResponse.message
            );
            console.log(
              "Fail Catalog Listing Message====>",
              failCatalogListingMessage
            );
            await sendResponseToWhatsapp({
              body: failCatalogListingMessage,
              receiver: whatsappNumber.split(":")[1]
            });
          }
        } else {
          // Check Continuty of transaction
          session.chats.push({
            role: "model",
            text: "",
            message_id: "",
            json: "",
            action: DISCONTINUITY.FLOW_BREAK,
            flow: "presumer"
          });
          updateSession(whatsappNumber, session);
          session = getSession(whatsappNumber);
        }
      }
      // Ask Flow Break Confirmation
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
        DISCONTINUITY.FLOW_BREAK
      ) {
        const discontinueFlowMessage = await getAiReponseFromPrompt(
          prefix_prompt_group.aiDiscontinueFlowMessage,
          ""
        );
        console.log("Discontinue Flow Message===>", discontinueFlowMessage);
        session.chats.push({
          role: "model",
          text: discontinueFlowMessage,
          message_id: "",
          json: "",
          action: DISCONTINUITY.FLOW_BREAK_CONFIRMATION,
          flow: "presumer"
        });
        updateSession(whatsappNumber, session);
        await sendResponseToWhatsapp({
          body: discontinueFlowMessage,
          receiver: whatsappNumber.split(":")[1]
        });
        return res.send("Message sent");
      }

      // Send Session Cleared Confirmation and Clear the session if yes else roll back to previous state
      if (
        session &&
        session.chats.length &&
        session.chats[session.chats.length - 1].action ===
        DISCONTINUITY.FLOW_BREAK_CONFIRMATION
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
          deleteSession(whatsappNumber);
          const discontinueFlowConfirmMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiDiscontinueFlowConfirmMessage,
            ""
          );
          console.log(
            "Discontinue Flow Confirm Message===>",
            discontinueFlowConfirmMessage
          );
          await sendResponseToWhatsapp({
            body: discontinueFlowConfirmMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          return res.send("Message sent");
        } else {
          session.chats.pop();
          session.chats.pop();
          updateSession(whatsappNumber, session);
          const rollBackToPrevStateMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiRollbackToPrevState,
            userMessage
          );
          await sendResponseToWhatsapp({
            body: rollBackToPrevStateMessage,
            receiver: whatsappNumber.split(":")[1]
          });
          return res.send("Message sent");
        }
      }
    }
    return res.send("message sent");
  } catch (err: any) {
    console.log(err);
    await sendResponseToWhatsapp({
      body: messages.APPOLOGY_MESSAGE,
      receiver: whatsappNumber.split(":")[1]
    });
  }
};

export const generalFlow = async () => { };
