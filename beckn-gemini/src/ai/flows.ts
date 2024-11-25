import { StateGraph, Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from './types';
import { 
  createSession, 
  deleteSession, 
  getAiReponseFromPrompt, 
  getSession,
  imageRecognition,
  updateSession
} from './services';
import { sendResponseToWhatsapp } from '../twilio/services';
import { BECKN_ACTIONS, CONSUMER_ACTIONS, DISCONTINUITY, messages, prefix_prompt_group } from '../constant';
import { saveEnergyRequest } from '../non-beckn/services';
import { Response } from 'express';
import { IBecknCache, IBecknChat } from "../cache";
import { MemorySaver } from "@langchain/langgraph";
import { makeBecknCall } from "../beckn/services";
import { generateQRCode } from "../utils/qr-code-utils";
import { createQuote } from "../utils/quote-utils";

// Define the graph state
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  }),
  whatsappNumber: Annotation<string>(),
  session: Annotation<any>(),
  sellDetails: Annotation<string>()
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const setupPresumerFlow = () => {
  // Create a new StateGraph instance
  const workflow = new StateGraph(StateAnnotation);

  // Define the function that calls the model for sell intent
  async function processSellIntent(state: typeof StateAnnotation.State) {
    const extractSellDetails = await getAiReponseFromPrompt(
      prefix_prompt_group.aiCheckSellDetails,
      state.messages[state.messages.length - 1].content
    );

    if (extractSellDetails === 'false' || extractSellDetails.includes('false')) {
      return { 
        messages: [new AIMessage("Cannot process sell request")],
        sellDetails: null
      };
    }

    return {
      messages: [new AIMessage("Processing sell request...")],
      sellDetails: extractSellDetails
    };
  }

  // Define the function that processes catalog
  async function processCatalog(state: typeof StateAnnotation.State) {
    const userAcceptance = await getAiReponseFromPrompt(
      prefix_prompt_group.aiCheckAcceptance,
      state.messages[state.messages.length - 1].content
    );

    if (userAcceptance.includes("'acceptance':'true'") || 
        userAcceptance.includes("{'acceptance': 'true'}")) {
      
      if (!state.sellDetails) {
        throw new Error('Sell details not found in state');
      }

      const sellDetailsObj = JSON.parse(state.sellDetails);
      if (!sellDetailsObj.units) {
        throw new Error('Units not found in sell details');
      }

      const uploadCatalogResponse = await saveEnergyRequest({
        phone: state.whatsappNumber.split("+91")[1],
        unit: Number(sellDetailsObj.units),
        start_date: "2024-10-04T10:00:00.000Z",
        end_date: "2024-10-04T18:00:00.000Z"
      });

      if (uploadCatalogResponse.status === "SUCCESS") {
        const successMessage = await getAiReponseFromPrompt(
          prefix_prompt_group.aiSuccessCatalogListing,
          ""
        );
        await sendResponseToWhatsapp({
          body: successMessage,
          receiver: state.whatsappNumber.split(":")[1]
        });
        return { 
          messages: [new AIMessage(successMessage)]
        };
      }
    }

    return {
      messages: [new AIMessage("Catalog processing failed")]
    };
  }

  // Define the function that determines whether to continue or not
  function shouldContinue(state: typeof StateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    
    if (state.sellDetails) {
      return "process_catalog";
    }
    
    return "__end__";
  }

  // Add nodes and edges
  workflow
    .addNode("sell_intent", processSellIntent)
    .addNode("process_catalog", processCatalog)
    .addEdge("__start__", "sell_intent")
    .addConditionalEdges(
      "sell_intent",
      shouldContinue
    );

  return workflow;
};

export const presumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  try {
    const workflow = setupPresumerFlow();
    
    // Initialize state
    const initialState = {
      messages: [new HumanMessage(userMessage)],
      whatsappNumber,
      session: getSession(whatsappNumber) || createSession(whatsappNumber),
      sellDetails: null
    };

    // Execute flow
    const app = workflow.compile();
    const finalState = await app.invoke(initialState);

    return res.send('Message sent!');
  } catch (err) {
    console.error(err);
    await sendResponseToWhatsapp({
      body: messages.APPOLOGY_MESSAGE,
      receiver: whatsappNumber.split(':')[1]
    });
    return res.send('Error handled');
  }
};

// Add consumer flow state annotation
const ConsumerStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  }),
  whatsappNumber: Annotation<string>(),
  session: Annotation<any>(),
  mediaUrl: Annotation<string>(),
  billData: Annotation<string>()
});

// At the top of the file, add this type declaration
const CONSUMER_NODES = {
  START: "__start__",
  END: "__end__",
  CHECK_SESSION: "check_session",
  WAIT_FOR_BILL: "wait_for_bill",
  PROCESS_BILL: "process_bill",
  WAIT_FOR_SIGNUP: "wait_for_signup",
  SIGNUP: "signup",
  SEND_OTP: "send_otp",
  HANDLE_FLOW_BREAK: "handle_flow_break",
  HANDLE_FLOW_BREAK_CONFIRMATION: "handle_flow_break_confirmation",
  WAIT_FOR_OTP: "wait_for_otp",
  VERIFY_OTP: "verify_otp",
  BECKN_SEARCH: "beckn_search",
  WAIT_FOR_SEARCH: "wait_for_search",
  WAIT_FOR_SELECT: "wait_for_select",
  BECKN_SELECT: "beckn_select",
  WAIT_FOR_INIT: "wait_for_init",
  BECKN_INIT_CONFIRM: "beckn_init_confirm",
  RECURRING_PURCHASE: "recurring_purchase",
  WAIT_FOR_FLOW_BREAK_CONFIRMATION: "wait_for_flow_break_confirmation"
} as const;

type ConsumerNodeType = typeof CONSUMER_NODES[keyof typeof CONSUMER_NODES];

export const setupConsumerFlow = () => {
  const workflow = new StateGraph(ConsumerStateAnnotation);

  async function checkSession(state: typeof ConsumerStateAnnotation.State) {
    const session = getSession(state.whatsappNumber);
    
    if (!session) {
      createSession(state.whatsappNumber);
    }
    
    if (!session?.chats?.length) {
      const sureHelpWithBuyingMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiSureHelpWithBuying,
        ""
      );

      console.log("Sure Help With Buying Message", sureHelpWithBuyingMessage);

      const uploadBillMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiUploadBill,
        ""
      );

      // Update session with initial messages
      const updatedSession = {
        chats: [{
          role: "model",
          text: sureHelpWithBuyingMessage,
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.UPLOAD_BILL,
          flow: "consumer"
        }, {
          role: "model",
          text: uploadBillMessage,
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.UPLOAD_BILL,
          flow: "consumer"
        }]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);

      await sendResponseToWhatsapp({
        body: sureHelpWithBuyingMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });
      
      await sendResponseToWhatsapp({
        body: uploadBillMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });

      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(sureHelpWithBuyingMessage),
          new AIMessage(uploadBillMessage)
        ],
        session: updatedSession
      };
    }

    return {
      ...state,
      session
    };
  }

  async function waitForBillUpload(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow 2 - Waiting for bill upload");
    // This node acts as a human feedback point
    // The state will be saved here and resumed when user uploads bill
    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for bill upload")]
    };
  }


  async function processBill(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow 3 - Processing bill", state);
    
    if (!state.mediaUrl) {
      return {
        ...state,
        messages: [...state.messages, new AIMessage("No bill image provided")]
      };
    }

    const imageData = await imageRecognition(state.mediaUrl);

    // let processedMessage = "";


    
    // if(!noImageData) {
    //    processedMessage = await getAiReponseFromPrompt(
    //     prefix_prompt_group.aiImageProcessedMessage,
    //     imageData
    //   );
    // }

    const processedMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiImageProcessedMessage,
      imageData || ""
    );


    if (processedMessage && processedMessage.includes('Not an electricity bill')) {
      const wrongImageMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiWrongImageMessage,
        imageData
      );

      console.log("Wrong Image Message", wrongImageMessage);
      
      // Update session with error
      const updatedSession = {
        ...state.session,
        chats: [
          ...state.session.chats,
          {
            role: "model",
            text: wrongImageMessage,
            message_id: "",
            json: "",
            action: CONSUMER_ACTIONS.UPLOAD_BILL,
            flow: "consumer"
          }
        ]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);
      
      await sendResponseToWhatsapp({
        body: wrongImageMessage,
        receiver: state.whatsappNumber.split(':')[1]
      });

      return {
        ...state,
        messages: [...state.messages, new AIMessage(wrongImageMessage)],
        session: updatedSession,
        billData: null,
        lastMessage: wrongImageMessage // Add this for API response
      };
    }

    // Valid bill case
    await sendResponseToWhatsapp({
      body: processedMessage,
      receiver: state.whatsappNumber.split(':')[1]
    });

    // Get signup message
    const signUpMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSignupAsk,
      ""
    );

    console.log("Sign Up Message==>", signUpMessage);

    // Update session with both processed bill and signup prompt
    const updatedSession = {
      ...state.session,
      chats: [
        ...state.session.chats,
        {
          role: "model",
          text: processedMessage,
          message_id: "",
          json: imageData,
          action: CONSUMER_ACTIONS.PROCESS_BILL,
          flow: "consumer"
        },
        {
          role: "model",
          text: signUpMessage,
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.SIGNUP,
          flow: "consumer"
        }
      ]
    };
    updateSession(state.whatsappNumber, updatedSession as IBecknCache);

    // Send signup message
    await sendResponseToWhatsapp({
      body: signUpMessage,
      receiver: state.whatsappNumber.split(':')[1]
    });

    return {
      ...state,
      messages: [
        ...state.messages, 
        new AIMessage(processedMessage),
        new AIMessage(signUpMessage)
      ],
      session: updatedSession,
      billData: imageData,
      lastMessage: `${processedMessage}\n\n${signUpMessage}` // Combined messages for API response
    };
  }

  async function handleSignup(state: typeof ConsumerStateAnnotation.State) {
    // First check if we're resuming after OTP was sent
    console.log("Inside handleSignup");
    const lastAction = state.session?.chats[state.session.chats.length - 1]?.action;
    if (lastAction === CONSUMER_ACTIONS.OTP_SENT) {
      return {
        ...state,
        signupAccepted: true  // Skip the acceptance check and proceed
      };
    }

    // If not resuming, proceed with normal signup flow
    const userAcceptance = await getAiReponseFromPrompt(
      prefix_prompt_group.aiCheckAcceptance,
      state.messages[state.messages.length - 1].content
    );

    if (
      userAcceptance.includes("'acceptance':'true'") ||
      userAcceptance.includes("{'acceptance': 'true'}")
    ) {
      return {
        ...state,
        signupAccepted: true
      };
    }

    // If not accepted, add flow break to session
    const updatedSession = {
      ...state.session,
      chats: [
        ...state.session.chats,
        {
          role: "model",
          text: "",
          message_id: "",
          json: "",
          action: DISCONTINUITY.FLOW_BREAK,
          flow: "consumer"
        }
      ]
    };
    updateSession(state.whatsappNumber, updatedSession as IBecknCache);

    return {
      ...state,
      session: updatedSession,
      signupAccepted: false
    };
  }

  async function sendOtp(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Sending OTP");
    
    const proceedWithP2PRegistrationMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiProceedWithP2PRegistration,
      ""
    );

    await sendResponseToWhatsapp({
      body: proceedWithP2PRegistrationMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    await delay(1000);

    const otpSentMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSendOTPMessage,
      ""
    );

    // Update session with OTP sent status
    const updatedSession = {
      ...state.session,
      chats: [
        ...state.session.chats,
        {
          role: "model",
          text: proceedWithP2PRegistrationMessage,
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.OTP_SENT,
          flow: "consumer"
        },
        {
          role: "model",
          text: otpSentMessage,
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.OTP_SENT,
          flow: "consumer"
        }
      ]
    };
    updateSession(state.whatsappNumber, updatedSession as IBecknCache);

    await sendResponseToWhatsapp({
      body: otpSentMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    console.log("Otp Sent Message==>", otpSentMessage);

    return {
      ...state,
      messages: [
        ...state.messages,
        new AIMessage(proceedWithP2PRegistrationMessage),
        new AIMessage(otpSentMessage)
      ],
      session: updatedSession,
      lastMessage: `${proceedWithP2PRegistrationMessage}\n\n${otpSentMessage}`
    };
  }

  // Add the new node functions
  async function handleFlowBreak(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Handling Flow Break");
    
    const discontinueFlowMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiDiscontinueFlowMessage,
      ""
    );

    console.log("Discontinue Flow Message===>", discontinueFlowMessage);

    await sendResponseToWhatsapp({
      body: discontinueFlowMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    // Update session with discontinue message
    const updatedSession = {
      ...state.session,
      chats: [
        ...state.session.chats,
        {
          role: "model",
          text: discontinueFlowMessage,
          message_id: "",
          json: "",
          action: DISCONTINUITY.FLOW_BREAK_CONFIRMATION,
          flow: "consumer"
        }
      ]
    };
    updateSession(state.whatsappNumber, updatedSession as IBecknCache);

  

    return {
      ...state,
      messages: [...state.messages, new AIMessage(discontinueFlowMessage)],
      session: updatedSession,
      lastMessage: discontinueFlowMessage
    };
  }

  async function handleFlowBreakConfirmation(state: typeof ConsumerStateAnnotation.State) {
    // User confirmed discontinuation
    const discontinueFlowConfirmMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiDiscontinueFlowConfirmMessage,
      ""
    );

    await sendResponseToWhatsapp({
      body: discontinueFlowConfirmMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    return {
      ...state,
      messages: [...state.messages, new AIMessage(discontinueFlowConfirmMessage)],
      lastMessage: discontinueFlowConfirmMessage
    };
  }

  // Add wait for OTP node
  async function waitForOtp(state: typeof ConsumerStateAnnotation.State) {
    console.log("\n===> Consumer Flow - Inside waitForOtp handler");
    console.log("Transitioning from SEND_OTP to WAIT_FOR_OTP");
    console.log("State at transition:", {
      lastMessage: state.messages[state.messages.length - 1],
      sessionLastAction: state.session?.chats[state.session.chats.length - 1]?.action,
      whatsappNumber: state.whatsappNumber
    });

    // Update session to reflect we're waiting for OTP
    const updatedSession = {
      ...state.session,
      chats: [
        ...state.session.chats,
        {
          role: "system",
          text: "Waiting for OTP input",
          message_id: "",
          json: "",
          action: CONSUMER_ACTIONS.OTP_SENT,
          flow: "consumer"
        }
      ]
    };
    updateSession(state.whatsappNumber, updatedSession as IBecknCache);

    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for OTP input")],
      session: updatedSession,
      waitingForOtp: true
    };
  }

  // Add verify OTP node
  async function verifyOtp(state: typeof ConsumerStateAnnotation.State) {

    console.log("\n===> Consumer Flow - Inside verifyOtp handler");
    const lastAction = state.session?.chats[state.session.chats.length - 1]?.action;
    console.log("Last Action==>", lastAction);
    const detectOTP = await getAiReponseFromPrompt(
      prefix_prompt_group.aiDetectOTP,
      state.messages[state.messages.length - 1].content
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

      // Clean up usage profile details if needed
      if (typeof usageProfileDetails === 'string' && usageProfileDetails.startsWith("```")) {
        usageProfileDetails = JSON.parse(
          usageProfileDetails.split("```")[1].split("json")[1]
        );
      }

      // Send both messages
      await sendResponseToWhatsapp({
        body: validOtpMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });

      await sendResponseToWhatsapp({
        body: usageProfileDetails?.message || usageProfileDetails,
        receiver: state.whatsappNumber.split(":")[1]
      });

      // Update session
      const updatedSession = {
        ...state.session,
        chats: [
          ...state.session.chats,
          {
            role: "model",
            text: validOtpMessage,
            message_id: "",
            json: JSON.stringify(usageProfileDetails),
            action: CONSUMER_ACTIONS.VERIFY_OTP,
            flow: "consumer"
          }
        ]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);

      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(validOtpMessage),
          new AIMessage(usageProfileDetails?.message || usageProfileDetails)
        ],
        session: updatedSession,
        lastMessage: `${validOtpMessage}\n\n${usageProfileDetails?.message || usageProfileDetails}`,
        otpVerified: true
      };
    } else {
      const invalidOTPMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiInvalidOTP,
        ""
      );

      console.log("Invalid OTP Message===>", invalidOTPMessage);
      
      await sendResponseToWhatsapp({
        body: invalidOTPMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });

      return {
        ...state,
        messages: [...state.messages, new AIMessage(invalidOTPMessage)],
        lastMessage: invalidOTPMessage,
        otpVerified: false
      };
    }
  }

  // Add the beckn search node function
  async function becknSearch(state: typeof ConsumerStateAnnotation.State) {
    const connectToUeiP2PMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiConnectToUeiP2P,
      ""
    );

    await sendResponseToWhatsapp({
      body: connectToUeiP2PMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    let searchIntentMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSearchIntent,
      ""
    );

    await sendResponseToWhatsapp({
      body: searchIntentMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    // Get units from verify OTP step
    const verifyOTPStep = state.session.chats.find(
      (chat: IBecknChat) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
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

      console.log("Beckn ON Search===>", JSON.stringify(becknSearchResponse));
      
      let becknOnSearchMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiBecknOnSearch,
        JSON.stringify({ becknSearchResponse, units })
      );

      // Update session
      const updatedSession = {
        ...state.session,
        chats: [
          ...state.session.chats,
          {
            role: "model",
            text: becknOnSearchMessage,
            message_id: "",
            json: JSON.stringify(becknSearchResponse),
            action: BECKN_ACTIONS.search,
            flow: "consumer"
          }
        ]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);

      await sendResponseToWhatsapp({
        body: becknOnSearchMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });

      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(connectToUeiP2PMessage),
          new AIMessage(searchIntentMessage),
          new AIMessage(becknOnSearchMessage)
        ],
        session: updatedSession,
        lastMessage: `${connectToUeiP2PMessage}\n\n${searchIntentMessage}\n\n${becknOnSearchMessage}`,
        searchResponse: becknSearchResponse
      };
    }

    return state;
  }

  // Add the wait for search node function
  async function waitForSearch(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Waiting for search confirmation");
    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for search confirmation")]
    };
  }

  // Add the beckn select node function
  async function becknSelect(state: typeof ConsumerStateAnnotation.State) {
    const verifyOTPStep = state.session.chats.find(
      (chat: IBecknChat) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
    );
    const units = JSON.parse(verifyOTPStep.json).units;

    let selectIntentMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSelectIntent,
      `${units} units`
    );

    await sendResponseToWhatsapp({
      body: selectIntentMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    const searchStep = state.session.chats.find(
      (chat: IBecknChat) => chat.action === BECKN_ACTIONS.search
    );

    if (searchStep) {
      // Make Beckn Select Call
      const becknSelectResponse = await makeBecknCall(
        BECKN_ACTIONS.select,
        {
          on_search: JSON.parse(searchStep.json),
          units
        }
      );

      console.log("Beckn ON Select===>", JSON.stringify(becknSelectResponse));

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
        receiver: state.whatsappNumber.split(":")[1]
      });

      // Update session
      const updatedSession = {
        ...state.session,
        chats: [
          ...state.session.chats,
          {
            role: "model",
            text: selectIntentMessage,
            message_id: "",
            json: JSON.stringify(becknSelectResponse),
            action: BECKN_ACTIONS.select,
            flow: "consumer"
          }
        ]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);

      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(selectIntentMessage),
          new AIMessage(beautifyQuoteMessage)
        ],
        session: updatedSession,
        lastMessage: `${selectIntentMessage}\n\n${beautifyQuoteMessage}`,
        selectResponse: becknSelectResponse
      };
    }

    return state;
  }

  // Add wait for select node
  async function waitForSelect(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Waiting for select confirmation");
    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for select confirmation")]
    };
  }

  // Add the beckn init and confirm node function
  async function becknInitAndConfirm(state: typeof ConsumerStateAnnotation.State) {
    const selectStep = state.session.chats.find(
      (chat: IBecknChat) => chat.action === BECKN_ACTIONS.select
    );
    const verifyOTPStep = state.session.chats.find(
      (chat: IBecknChat) => chat.action === CONSUMER_ACTIONS.VERIFY_OTP
    );

    if (selectStep) {
      const units = JSON.parse(verifyOTPStep.json).units;
      
      // Make Beckn Init Call
      const becknInitResponse = await makeBecknCall(
        BECKN_ACTIONS.init,
        {
          on_select: JSON.parse(selectStep.json),
          units,
          phone: state.whatsappNumber.split(":")[1].split("+91")[1]
        }
      );

      console.log("Beckn ON Init===>", JSON.stringify(becknInitResponse));

      const onInitMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiBecknOnInit,
        JSON.stringify({ becknInitResponse })
      );

      // Update session with init response
      let updatedSession = {
        ...state.session,
        chats: [
          ...state.session.chats,
          {
            role: "model",
            text: onInitMessage,
            message_id: "",
            json: JSON.stringify(becknInitResponse),
            action: BECKN_ACTIONS.init,
            flow: "consumer"
          }
        ]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);

      await sendResponseToWhatsapp({
        body: onInitMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });

      // Generate and send QR Code
      generateQRCode();
      await sendResponseToWhatsapp({
        body: "",
        receiver: state.whatsappNumber.split(":")[1],
        media_url: `${process.env.AI_SERVER_URL}/static/qrcode.png`
      });

      await delay(30000);

      // Make Beckn Confirm Call
      const becknConfirmResponse = await makeBecknCall(
        BECKN_ACTIONS.confirm,
        {
          on_select: JSON.parse(selectStep.json),
          units,
          phone: state.whatsappNumber.split(":")[1].split("+91")[1]
        }
      );

      console.log("Beckn ON Confirm===>", JSON.stringify(becknConfirmResponse));

      const onConfirmMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiBecknOnConfirm,
        JSON.stringify({ becknConfirmResponse, units })
      );

      // Update session with confirm response
      updatedSession = {
        ...updatedSession,
        chats: [
          ...updatedSession.chats,
          {
            role: "model",
            text: onConfirmMessage,
            message_id: "",
            json: JSON.stringify(becknConfirmResponse),
            action: BECKN_ACTIONS.confirm,
            flow: "consumer"
          }
        ]
      };
      updateSession(state.whatsappNumber, updatedSession as IBecknCache);

      await sendResponseToWhatsapp({
        body: onConfirmMessage,
        receiver: state.whatsappNumber.split(":")[1]
      });

      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(onInitMessage),
          new AIMessage(onConfirmMessage)
        ],
        session: updatedSession,
        lastMessage: `${onInitMessage}\n\n${onConfirmMessage}`,
        initConfirmComplete: true
      };
    }

    return state;
  }

  // Add wait for init node
  async function waitForInit(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Waiting for init confirmation");
    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for init confirmation")]
    };
  }

  // Add the recurring purchase node function
  async function handleRecurringPurchase(state: typeof ConsumerStateAnnotation.State) {
    const recurringPurchaseMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiCheckRecurrignPurchaseAcceptance,
      state.messages[state.messages.length - 1].content
    );

    console.log("User Recurring Purchase Acceptance===>", recurringPurchaseMessage);

    await sendResponseToWhatsapp({
      body: recurringPurchaseMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    // Delete session as this is the end of flow
    deleteSession(state.whatsappNumber);

    return {
      ...state,
      messages: [...state.messages, new AIMessage(recurringPurchaseMessage)],
      lastMessage: recurringPurchaseMessage,
      session: null
    };
  }

  // Add wait for flow break confirmation node
  async function waitForFlowBreakConfirmation(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Waiting for flow break confirmation");
    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for flow break confirmation")]
    };
  }

  // Update the workflow to include new nodes and edges
  workflow
    .addNode(CONSUMER_NODES.CHECK_SESSION, checkSession)
    .addNode(CONSUMER_NODES.WAIT_FOR_BILL, waitForBillUpload)
    .addNode(CONSUMER_NODES.PROCESS_BILL, processBill)
    .addNode(CONSUMER_NODES.SIGNUP, handleSignup)
    .addNode(CONSUMER_NODES.SEND_OTP, sendOtp)
    .addNode(CONSUMER_NODES.HANDLE_FLOW_BREAK, handleFlowBreak)
    .addNode(CONSUMER_NODES.HANDLE_FLOW_BREAK_CONFIRMATION, handleFlowBreakConfirmation)
    .addNode(CONSUMER_NODES.WAIT_FOR_OTP, waitForOtp)
    .addNode(CONSUMER_NODES.VERIFY_OTP, verifyOtp)
    .addNode(CONSUMER_NODES.BECKN_SEARCH, becknSearch)
    .addNode(CONSUMER_NODES.WAIT_FOR_SEARCH, waitForSearch)
    .addNode(CONSUMER_NODES.WAIT_FOR_SELECT, waitForSelect)
    .addNode(CONSUMER_NODES.BECKN_SELECT, becknSelect)
    .addNode(CONSUMER_NODES.WAIT_FOR_INIT, waitForInit)
    .addNode(CONSUMER_NODES.BECKN_INIT_CONFIRM, becknInitAndConfirm)
    .addNode(CONSUMER_NODES.RECURRING_PURCHASE, handleRecurringPurchase)
    .addNode(CONSUMER_NODES.WAIT_FOR_FLOW_BREAK_CONFIRMATION, waitForFlowBreakConfirmation)
    .addEdge(CONSUMER_NODES.START, CONSUMER_NODES.CHECK_SESSION)
    .addConditionalEdges(
      CONSUMER_NODES.CHECK_SESSION,
      (state) => {
        const session = getSession(state.whatsappNumber);
        
        if (state.mediaUrl) {
          return CONSUMER_NODES.PROCESS_BILL;
        }

        const billProcessed = session?.chats?.some(
          (chat: IBecknChat) => chat.action === CONSUMER_ACTIONS.PROCESS_BILL
        );
        if (billProcessed) {
          return CONSUMER_NODES.SIGNUP;
        }

        return CONSUMER_NODES.WAIT_FOR_BILL;
      }
    )
    .addConditionalEdges(
      CONSUMER_NODES.WAIT_FOR_BILL,
      (state) => state.mediaUrl ? CONSUMER_NODES.PROCESS_BILL : CONSUMER_NODES.END
    )
    .addConditionalEdges(
      CONSUMER_NODES.PROCESS_BILL,
      (state) => state.billData ? CONSUMER_NODES.SIGNUP : CONSUMER_NODES.WAIT_FOR_BILL
    )
    .addConditionalEdges(
      CONSUMER_NODES.SIGNUP,
      async (state) => {
        // Check if we're resuming after OTP was sent
        console.log("State==>", state.session.chats);
        const lastAction = state.session?.chats[state.session.chats.length - 1]?.action;
        console.log("Last Action==>", lastAction);
        if (lastAction === CONSUMER_ACTIONS.OTP_SENT) {
          return CONSUMER_NODES.VERIFY_OTP;
        }
        else if (lastAction === CONSUMER_ACTIONS.VERIFY_OTP) {
          return CONSUMER_NODES.BECKN_SEARCH;
        }

        // If not resuming, check for user acceptance
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content
        );

        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          return CONSUMER_NODES.SEND_OTP;
        }

        // If not accepted, add flow break to session and go to flow break handler
        console.log("User not accepted, adding flow break to session");
        const updatedSession = {
          ...state.session,
          chats: [
            ...state.session.chats,
            {
              role: "model",
              text: "",
              message_id: "",
              json: "",
              action: DISCONTINUITY.FLOW_BREAK,
              flow: "consumer"
            }
          ]
        };
        updateSession(state.whatsappNumber, updatedSession as IBecknCache);

        return CONSUMER_NODES.HANDLE_FLOW_BREAK;
      }
    )

    .addEdge(
      CONSUMER_NODES.SEND_OTP,
      CONSUMER_NODES.WAIT_FOR_OTP
    )
    .addEdge(
      CONSUMER_NODES.WAIT_FOR_OTP,
      CONSUMER_NODES.VERIFY_OTP
    )
    .addEdge(
      CONSUMER_NODES.VERIFY_OTP,
      CONSUMER_NODES.WAIT_FOR_SEARCH
    )
    .addConditionalEdges(
      CONSUMER_NODES.WAIT_FOR_SEARCH,
      async (state) => {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content
        );

        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          return CONSUMER_NODES.BECKN_SEARCH;
        }

        // If not accepted, add flow break to session
        const updatedSession = {
          ...state.session,
          chats: [
            ...state.session.chats,
            {
              role: "model",
              text: "",
              message_id: "",
              json: "",
              action: DISCONTINUITY.FLOW_BREAK,
              flow: "consumer"
            }
          ]
        };
        updateSession(state.whatsappNumber, updatedSession as IBecknCache);

        return CONSUMER_NODES.HANDLE_FLOW_BREAK;
      }
    )
    .addEdge(
      CONSUMER_NODES.HANDLE_FLOW_BREAK,
      CONSUMER_NODES.WAIT_FOR_FLOW_BREAK_CONFIRMATION
    )
    .addEdge(
      CONSUMER_NODES.WAIT_FOR_FLOW_BREAK_CONFIRMATION,
      CONSUMER_NODES.HANDLE_FLOW_BREAK_CONFIRMATION
    )
    .addConditionalEdges(
      CONSUMER_NODES.HANDLE_FLOW_BREAK_CONFIRMATION,
      async (state) => {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content
        );

        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          // User wants to discontinue
          deleteSession(state.whatsappNumber);
          return CONSUMER_NODES.END;
        } else {
          // User wants to continue - roll back
          const session = state.session;
          // Remove last two actions (FLOW_BREAK and FLOW_BREAK_CONFIRMATION)
          session.chats.pop();
          session.chats.pop();
          updateSession(state.whatsappNumber, session);

          const rollBackToPrevStateMessage = await getAiReponseFromPrompt(
            prefix_prompt_group.aiRollbackToPrevState,
            ""
          );

          await sendResponseToWhatsapp({
            body: rollBackToPrevStateMessage,
            receiver: state.whatsappNumber.split(":")[1]
          });

          // Return to previous state based on last action
          return session.chats[session.chats.length - 1]?.action === CONSUMER_ACTIONS.SIGNUP 
            ? CONSUMER_NODES.SIGNUP 
            : CONSUMER_NODES.WAIT_FOR_BILL;
        }
      }
    )
    .addEdge(
      CONSUMER_NODES.BECKN_SEARCH,
      CONSUMER_NODES.WAIT_FOR_SELECT
    )
    .addConditionalEdges(
      CONSUMER_NODES.WAIT_FOR_SELECT,
      async (state) => {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content
        );

        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          return CONSUMER_NODES.BECKN_SELECT;
        }

        // If not accepted, add flow break to session
        const updatedSession = {
          ...state.session,
          chats: [
            ...state.session.chats,
            {
              role: "model",
              text: "",
              message_id: "",
              json: "",
              action: DISCONTINUITY.FLOW_BREAK,
              flow: "consumer"
            }
          ]
        };
        updateSession(state.whatsappNumber, updatedSession as IBecknCache);

        return CONSUMER_NODES.HANDLE_FLOW_BREAK;
      }
    )
    .addEdge(
      CONSUMER_NODES.BECKN_SELECT,
      CONSUMER_NODES.WAIT_FOR_INIT
    )
    .addConditionalEdges(
      CONSUMER_NODES.WAIT_FOR_INIT,
      async (state) => {
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content
        );

        if (
          userAcceptance.includes("'acceptance':'true'") ||
          userAcceptance.includes("{'acceptance': 'true'}")
        ) {
          return CONSUMER_NODES.BECKN_INIT_CONFIRM;
        }

        // If not accepted, add flow break to session
        const updatedSession = {
          ...state.session,
          chats: [
            ...state.session.chats,
            {
              role: "model",
              text: "",
              message_id: "",
              json: "",
              action: DISCONTINUITY.FLOW_BREAK,
              flow: "consumer"
            }
          ]
        };
        updateSession(state.whatsappNumber, updatedSession as IBecknCache);

        return CONSUMER_NODES.HANDLE_FLOW_BREAK;
      }
    )
    .addEdge(
      CONSUMER_NODES.BECKN_INIT_CONFIRM,
      CONSUMER_NODES.RECURRING_PURCHASE
    )
    .addEdge(
      CONSUMER_NODES.RECURRING_PURCHASE,
      CONSUMER_NODES.END
    );

  return workflow;
};

export const consumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response,
  whatsappReq?: any
) => {
  try {
    console.log("Consumer Flow Started with thread ID:", whatsappNumber);
    const workflow = setupConsumerFlow();
    const checkpointer = new MemorySaver();
    
    const existingSession = getSession(whatsappNumber);
    console.log("Existing session:", existingSession?.chats[existingSession.chats.length - 1]);

    // Check if we're resuming from a wait node
    const lastAction = existingSession?.chats[existingSession.chats.length - 1]?.action;
    let resumeNode = null;

    if (lastAction === CONSUMER_ACTIONS.OTP_SENT) {
      resumeNode = CONSUMER_NODES.WAIT_FOR_OTP;
    } else if (lastAction === CONSUMER_ACTIONS.VERIFY_OTP) {
      resumeNode = CONSUMER_NODES.WAIT_FOR_SEARCH;
    }
    // ... add other wait node checks

    const initialState = {
      messages: [new HumanMessage(userMessage)],
      whatsappNumber,
      session: existingSession || createSession(whatsappNumber),
      mediaUrl: whatsappReq?.MediaUrl0,
      billData: null
    };

    const app = workflow.compile({
      checkpointer,
      interruptBefore: [
        // @ts-ignore
        CONSUMER_NODES.WAIT_FOR_BILL,
          // @ts-ignore
          CONSUMER_NODES.WAIT_FOR_OTP,
          // @ts-ignore
          CONSUMER_NODES.WAIT_FOR_SEARCH,
          // @ts-ignore
          CONSUMER_NODES.WAIT_FOR_SELECT,
          // @ts-ignore
          CONSUMER_NODES.WAIT_FOR_INIT,
          // @ts-ignore
          CONSUMER_NODES.WAIT_FOR_FLOW_BREAK_CONFIRMATION
      ] as const
    });

    if (resumeNode) {
      // Update state as if coming from the wait node
      await app.updateState(
        { configurable: { thread_id: whatsappNumber } },
        { messages: [new HumanMessage(userMessage)] },
        resumeNode // Specify which node we're resuming from
      );
    }

    const finalState = await app.invoke(
      initialState,
      {
        configurable: {
          thread_id: whatsappNumber
        }
      }
    );

    return res.json({
      status: 'success',
      message: finalState.lastMessage || 'No message sent',
      data: {
        whatsappNumber,
        session: finalState.session
      }
    });
  } catch (err) {
    console.error(err);
    await sendResponseToWhatsapp({
      body: messages.APPOLOGY_MESSAGE,
      receiver: whatsappNumber.split(':')[1]
    });
    
    return res.json({
      status: 'error',
      message: messages.APPOLOGY_MESSAGE,
      error: err instanceof Error ? err.message : 'Unknown error',
      data: {
        whatsappNumber
      }
    });
  }
};
