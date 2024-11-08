import { BecknLangGraph } from './beckn-langgraph';
import { makeBecknCall } from '../beckn/services';
import { sendResponseToWhatsapp } from '../twilio/services';
import { GraphContext } from './types';
import { 
  createSession, 
  deleteSession, 
  getAiReponseFromPrompt, 
  getSession,
  imageRecognition, 
  updateSession 
} from './services';
import { 
  BECKN_ACTIONS, 
  CONSUMER_ACTIONS,
  DISCONTINUITY,
  prefix_prompt_group,
  messages,
  PRESUMER_ACTIONS 
} from '../constant';
import { Response } from 'express';
import { saveEnergyRequest } from '../non-beckn/services';

export const setupConsumerFlow = (graph: BecknLangGraph) => {
  // Initial nodes
  graph.addNode({
    id: 'start',
    type: 'llm',
    next: ['check_session']
  });

  graph.addNode({
    id: 'check_session',
    type: 'action',
    next: ['upload_bill', 'process_existing_session']
  });

  graph.addNode({
    id: 'upload_bill',
    type: 'llm',
    next: ['wait_for_bill']
  });

  graph.addNode({
    id: 'wait_for_bill',
    type: 'action',
    next: ['process_bill']
  });

  graph.addNode({
    id: 'process_bill',
    type: 'action',
    next: ['signup']
  });

  graph.addNode({
    id: 'signup',
    type: 'llm',
    next: ['verify_signup']
  });

  // Add search related nodes
  graph.addNode({
    id: 'detect_intent',
    type: 'llm',
    next: ['process_intent']
  });

  graph.addNode({
    id: 'process_intent',
    type: 'action',
    next: ['search', 'upload_bill']
  });

  graph.addNode({
    id: 'search',
    type: 'action',
    next: ['show_search_results']
  });

  graph.addNode({
    id: 'show_search_results',
    type: 'llm',
    next: ['wait_for_selection']
  });

  // Add edges with conditions
  graph.addEdge({
    from: 'check_session',
    to: 'upload_bill',
    condition: (context: GraphContext) => !context.session?.chats?.length
  });

  graph.addEdge({
    from: 'check_session',
    to: 'process_existing_session',
    condition: (context: GraphContext) => !!context.session?.chats?.length
  });

  // Add search related actions
  graph.setContext('action_process_intent', async (context: GraphContext) => {
    const decisionFromAI = await getAiReponseFromPrompt(
      prefix_prompt_group.aiReponseFromUserPrompt,
      context.userMessage
    );
    console.log("Decision/Response from AI===>", decisionFromAI);
    return { intent: decisionFromAI };
  });

  graph.setContext('action_search', async (context: GraphContext) => {
    const searchOpenNetworkMSG = await getAiReponseFromPrompt(
      prefix_prompt_group.aiSearchingOnOpenNetwork,
      ""
    );
    
    await sendResponseToWhatsapp({
      body: searchOpenNetworkMSG,
      receiver: context.whatsappNumber.split(":")[1]
    });

    const searchResponse = await makeBecknCall(BECKN_ACTIONS.search, {
      units: context.units || "100" // Default or extracted from context
    });

    const formattedResponse = await getAiReponseFromPrompt(
      prefix_prompt_group.aiListOfSearchItem,
      JSON.stringify(searchResponse)
    );

    await sendResponseToWhatsapp({
      body: formattedResponse,
      receiver: context.whatsappNumber.split(":")[1]
    });

    return { searchResults: searchResponse };
  });

  // Add actions
  graph.setContext('action_check_session', async (context: GraphContext) => {
    const session = getSession(context.whatsappNumber);
    if (!session) {
      createSession(context.whatsappNumber);
    }
    return session;
  });

  graph.setContext('action_process_bill', async (context: GraphContext) => {
    if (!context.mediaUrl) {
      return {
        action: DISCONTINUITY.FLOW_BREAK,
        flow: 'consumer'
      };
    }

    const imageData = await imageRecognition(context.mediaUrl);
    const processedMessage = await getAiReponseFromPrompt(
      prefix_prompt_group.aiImageProcessedMessage,
      imageData
    );

    if (processedMessage.includes('Not an electricity bill')) {
      const wrongImageMessage = await getAiReponseFromPrompt(
        prefix_prompt_group.aiWrongImageMessage,
        imageData
      );
      await sendResponseToWhatsapp({
        body: wrongImageMessage,
        receiver: context.whatsappNumber.split(':')[1]
      });
      return { error: 'wrong_image' };
    }

    await sendResponseToWhatsapp({
      body: processedMessage,
      receiver: context.whatsappNumber.split(':')[1]
    });

    return { success: true, imageData };
  });
};

export const consumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response,
  whatsappReq?: any
) => {
  try {
    const graph = new BecknLangGraph();
    setupConsumerFlow(graph);

    // Set initial context
    graph.setContext('whatsappNumber', whatsappNumber);
    graph.setContext('userMessage', userMessage);
    graph.setContext('mediaUrl', whatsappReq?.MediaUrl0);

    // Execute flow
    const result = await graph.execute('start');

    if (result.error) {
    console.log("Dank here 1")
      await sendResponseToWhatsapp({
        body: messages.APPOLOGY_MESSAGE,
        receiver: whatsappNumber.split(':')[1]
      });
    }

    return res.send('Message sent!');
  } catch (err) {
    console.error(err);
    console.log("Dank here 2")
    await sendResponseToWhatsapp({
      body: messages.APPOLOGY_MESSAGE,
      receiver: whatsappNumber.split(':')[1]
    });
    return res.send('Error handled');
  }
};

export const setupPresumerFlow = (graph: BecknLangGraph) => {
  // Initial nodes
  graph.addNode({
    id: 'start',
    type: 'llm',
    next: ['check_session']
  });

  graph.addNode({
    id: 'check_session',
    type: 'action',
    next: ['sell_intent']
  });

  graph.addNode({
    id: 'sell_intent',
    type: 'llm',
    next: ['process_sell_intent']
  });

  graph.addNode({
    id: 'process_sell_intent',
    type: 'action',
    next: ['upload_catalog']
  });

  graph.addNode({
    id: 'upload_catalog',
    type: 'llm',
    next: ['process_catalog']
  });

  // Add edges
  graph.addEdge({
    from: 'check_session',
    to: 'sell_intent',
    condition: (context: GraphContext) => !context.session?.chats?.length
  });

  // Add actions
  graph.setContext('action_check_session', async (context: GraphContext) => {
    const session = getSession(context.whatsappNumber);
    if (!session) {
      createSession(context.whatsappNumber);
    }
    return session;
  });

  graph.setContext('action_process_sell_intent', async (context: GraphContext) => {
    const extractSellDetails = await getAiReponseFromPrompt(
      prefix_prompt_group.aiCheckSellDetails,
      context.userMessage
    );

    if (extractSellDetails === 'false' || extractSellDetails.includes('false')) {
      return {
        action: DISCONTINUITY.FLOW_BREAK,
        flow: 'presumer'
      };
    }

    return {
      success: true,
      sellDetails: extractSellDetails
    };
  });

  graph.setContext('action_process_catalog', async (context: GraphContext) => {
    const userAcceptance = await getAiReponseFromPrompt(
      prefix_prompt_group.aiCheckAcceptance,
      context.userMessage
    );

    if (userAcceptance.includes("'acceptance':'true'") || 
        userAcceptance.includes("{'acceptance': 'true'}")) {
      
      // Ensure sellDetails exists and has proper format
      if (!context.sellDetails) {
        throw new Error('Sell details not found in context');
      }

      const sellDetailsObj = JSON.parse(context.sellDetails);
      if (!sellDetailsObj.units) {
        throw new Error('Units not found in sell details');
      }

      const uploadCatalogResponse = await saveEnergyRequest({
        phone: context.whatsappNumber.split("+91")[1],
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
          receiver: context.whatsappNumber.split(":")[1]
        });
        return { success: true };
      }
    }

    return {
      action: DISCONTINUITY.FLOW_BREAK,
      flow: 'presumer'
    };
  });
};

export const presumerFlow = async (
  whatsappNumber: string,
  userMessage: string,
  res: Response
) => {
  try {
    const graph = new BecknLangGraph();
    setupPresumerFlow(graph);

    // Set initial context
    graph.setContext('whatsappNumber', whatsappNumber);
    graph.setContext('userMessage', userMessage);

    // Execute flow
    const result = await graph.execute('start');

    if (result.error) {
      await sendResponseToWhatsapp({
        body: messages.APPOLOGY_MESSAGE,
        receiver: whatsappNumber.split(':')[1]
      });
    }

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
