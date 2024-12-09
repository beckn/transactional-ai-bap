import { StateGraph, Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from './types';
import { 
  createSession, 
  deleteSession, 
  getAiReponseFromPrompt, 
  getSession,
  updateSession
} from './services';
import { sendResponseToWhatsapp } from '../twilio/services';
import { CONSUMER_ACTIONS, DISCONTINUITY, messages, prefix_prompt_group } from '../constant';
import { saveEnergyRequest } from '../non-beckn/services';
import { Response } from 'express';
import { IBecknCache, IBecknChat } from "../cache";
import { MemorySaver } from "@langchain/langgraph";

import { CONSUMER_NODES, ConsumerStateAnnotation, checkSession, waitForBillUpload, processBill, handleSignup, sendOtp, handleFlowBreak, handleFlowBreakConfirmation, waitForOtp, verifyOtp, becknSearch, waitForSearch, waitForSelect, becknSelect, waitForInit, becknInitAndConfirm, waitForRecurringPurchase, handleRecurringPurchase, waitForFlowBreakConfirmation } from "./consumer.nodes";

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
      state.messages[state.messages.length - 1].content as string
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
      state.messages[state.messages.length - 1].content as string
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



// At the top of the file, add this type declaration


type ConsumerNodeType = typeof CONSUMER_NODES[keyof typeof CONSUMER_NODES];

export const setupConsumerFlow = () => {
  const workflow = new StateGraph(ConsumerStateAnnotation);


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
    .addNode(CONSUMER_NODES.WAIT_FOR_SEARCH, waitForSearch)
    .addNode(CONSUMER_NODES.BECKN_SEARCH, becknSearch)
    .addNode(CONSUMER_NODES.WAIT_FOR_SELECT, waitForSelect)
    .addNode(CONSUMER_NODES.BECKN_SELECT, becknSelect)
    .addNode(CONSUMER_NODES.WAIT_FOR_INIT, waitForInit)
    .addNode(CONSUMER_NODES.BECKN_INIT_CONFIRM, becknInitAndConfirm)
    .addNode(CONSUMER_NODES.WAIT_FOR_RECURRING_PURCHASE, waitForRecurringPurchase)
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
        } else if (lastAction === CONSUMER_ACTIONS.SEARCH) {
          return CONSUMER_NODES.BECKN_SELECT;
        } else if (lastAction === CONSUMER_ACTIONS.SELECT) {
          return CONSUMER_NODES.BECKN_INIT_CONFIRM;
        } else if (lastAction === CONSUMER_ACTIONS.CONFIRM) {
          return CONSUMER_NODES.RECURRING_PURCHASE;
        } else if (lastAction === DISCONTINUITY.FLOW_BREAK_CONFIRMATION) {
          return CONSUMER_NODES.HANDLE_FLOW_BREAK_CONFIRMATION;
        }

        // If not resuming, check for user acceptance
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content as string
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
          state.messages[state.messages.length - 1].content as string
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

        console.log("Flow break condition state==>", state.messages);
        const userAcceptance = await getAiReponseFromPrompt(
          prefix_prompt_group.aiCheckAcceptance,
          state.messages[state.messages.length - 1].content as string
        );

        console.log("Flow break condition User Acceptance==>", userAcceptance);

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
          state.messages[state.messages.length - 1].content as string
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
          state.messages[state.messages.length - 1].content as string
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
      CONSUMER_NODES.WAIT_FOR_RECURRING_PURCHASE
    )
    .addEdge(
      CONSUMER_NODES.WAIT_FOR_RECURRING_PURCHASE,
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
      // @ts-ignore
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
          CONSUMER_NODES.WAIT_FOR_RECURRING_PURCHASE,
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

    // Get the last message from the messages array
    const lastMessage = finalState.messages?.[finalState.messages.length - 1]?.content || 'No message sent';

    return res.json({
      status: 'success',
      message: lastMessage,
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
