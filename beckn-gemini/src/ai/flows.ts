import { StateGraph, Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from './types';
import { 
  createSession, 
  getAiReponseFromPrompt, 
  getSession,
  imageRecognition,
  updateSession
} from './services';
import { sendResponseToWhatsapp } from '../twilio/services';
import { CONSUMER_ACTIONS, messages, prefix_prompt_group } from '../constant';
import { saveEnergyRequest } from '../non-beckn/services';
import { Response } from 'express';
import { IBecknCache, IBecknChat } from "../cache";
import { MemorySaver } from "@langchain/langgraph";

// Define the graph state
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  }),
  whatsappNumber: Annotation<string>(),
  session: Annotation<any>(),
  sellDetails: Annotation<string>()
});

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
  WAIT_FOR_BILL: "w",
  PROCESS_BILL: "process_bill",
  SIGNUP: "signup"
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

  // {
  //   const imageProcessedData = await imageRecognition(
  //     whatsappReq.MediaUrl0
  //   );
  //   const imageProcessedMessage = await getAiReponseFromPrompt(
  //     prefix_prompt_group.aiImageProcessedMessage,
  //     imageProcessedData
  //   );
  //   if (imageProcessedMessage.includes("Not an electricity bill")) {
  //     const wrongImageMessage = await getAiReponseFromPrompt(
  //       prefix_prompt_group.aiWrongImageMessage,
  //       imageProcessedData
  //     );
  //     await sendResponseToWhatsapp({
  //       body: wrongImageMessage,
  //       receiver: whatsappNumber.split(":")[1]
  //     });
  //     return res.send("Message Sent");
  //   }
  //   await sendResponseToWhatsapp({
  //     body: imageProcessedMessage,
  //     receiver: whatsappNumber.split(":")[1]
  //   });
  //   const signUpMessage = await getAiReponseFromPrompt(
  //     prefix_prompt_group.aiSignupAsk,
  //     ""
  //   );
  //   console.log("Sign Up Message==>", signUpMessage);
  //   session.chats.push({
  //     role: "model",
  //     text: signUpMessage,
  //     message_id: "",
  //     json: "",
  //     action: CONSUMER_ACTIONS.SIGNUP,
  //     flow: "consumer"
  //   });
  //   updateSession(whatsappNumber, session);
  //   await sendResponseToWhatsapp({
  //     body: signUpMessage,
  //     receiver: whatsappNumber.split(":")[1]
  //   });
  //   console.log("Session Content===>", getSession(whatsappNumber));
  //   return res.send("message");
  // }

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
    const signUpMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSignupAsk,
      ""
    );

    await sendResponseToWhatsapp({
      body: signUpMessage,
      receiver: state.whatsappNumber.split(":")[1]
    });

    // Update session with signup prompt
    const updatedSession = {
      ...state.session,
      chats: [
        ...state.session.chats,
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

    return {
      ...state,
      messages: [...state.messages, new AIMessage(signUpMessage)],
      session: updatedSession
    };
  }

  workflow
    .addNode(CONSUMER_NODES.CHECK_SESSION, checkSession)
    .addNode(CONSUMER_NODES.WAIT_FOR_BILL, waitForBillUpload)
    .addNode(CONSUMER_NODES.PROCESS_BILL, processBill)
    .addNode(CONSUMER_NODES.SIGNUP, handleSignup)
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
    const workflow = setupConsumerFlow();
    const checkpointer = new MemorySaver();
    
    const initialState = {
      messages: [new HumanMessage(userMessage)],
      whatsappNumber,
      session: getSession(whatsappNumber) || createSession(whatsappNumber),
      mediaUrl: whatsappReq?.MediaUrl0,
      billData: null
    };

    const app = workflow.compile({
      checkpointer,
      // @ts-ignore
      interruptBefore: CONSUMER_NODES.WAIT_FOR_BILL 
    });

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
