const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Tool } = require('langchain/tools');
const { StateGraph } = require('langgraph/graph');
const {
	search,
	select,
	init,
	confirm,
	status,
	track,
	cancel,
	support
} = require('./beckn-requests');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "your-api-key");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Define the tools with Beckn API requests
const tools = [
	new Tool({
		name: "Search",
		func: ({ item, location }) => search(item, location),
		description: "Use this to search for items. Input is the item name and delivery location (GPS coordinates)."
	}),
	new Tool({
		name: "Select",
		func: ({ bpp_id, bpp_uri, provider_id, item_id }) =>
			select(bpp_id, bpp_uri, provider_id, item_id),
		description: "Use this to select an item. Input is bpp_id, bpp_uri, provider_id, and item_id."
	}),
	new Tool({
		name: "Init",
		func: ({ bpp_id, bpp_uri, provider_id, item_id, billing_info, delivery_info }) =>
			init(bpp_id, bpp_uri, provider_id, item_id, billing_info, delivery_info),
		description: "Use this to initialize an order. Input is bpp_id, bpp_uri, provider_id, item_id, billing and delivery info."
	}),
	new Tool({
		name: "Confirm",
		func: ({ bpp_id, bpp_uri, provider_id, item_id, billing_info, delivery_info, payment_info }) =>
			confirm(bpp_id, bpp_uri, provider_id, item_id, billing_info, delivery_info, payment_info),
		description: "Use this to confirm an order. Input is bpp_id, bpp_uri, provider_id, item_id, billing, delivery, and payment info."
	}),
	new Tool({
		name: "Status",
		func: ({ bpp_id, bpp_uri, order_id }) => status(bpp_id, bpp_uri, order_id),
		description: "Use this to check the status of an order. Input is bpp_id, bpp_uri, and order_id."
	}),
	new Tool({
		name: "Track",
		func: ({ bpp_id, bpp_uri, order_id }) => track(bpp_id, bpp_uri, order_id),
		description: "Use this to track an order. Input is bpp_id, bpp_uri, and order_id."
	}),
	new Tool({
		name: "Cancel",
		func: ({ bpp_id, bpp_uri, order_id }) => cancel(bpp_id, bpp_uri, order_id),
		description: "Use this to cancel an order. Input is bpp_id, bpp_uri, and order_id."
	}),
	new Tool({
		name: "Support",
		func: ({ bpp_id, bpp_uri, order_id }) => support(bpp_id, bpp_uri, order_id),
		description: "Use this to request support for an order. Input is bpp_id, bpp_uri, and order_id."
	})
];

// Helper function to format messages for Gemini
function formatMessages(state) {
	const systemPrompt = "You are a helpful AI assistant that helps users order items using the Beckn protocol.";
	const availableTools = tools.map(tool => `${tool.name}: ${tool.description}`).join('\n');

	const messages = [
		systemPrompt,
		"Available tools:\n" + availableTools,
		...state.chat_history,
		state.input
	];

	return messages.join('\n\n');
}

// Function to parse tool calls from Gemini's response
function parseToolCalls(response) {
	const toolCallRegex = /([A-Z][a-zA-Z]*)\(({[^}]+})\)/;
	const match = response.match(toolCallRegex);

	if (match) {
		const [_, toolName, paramsString] = match;
		try {
			const params = JSON.parse(paramsString);
			return {
				type: 'tool_call',
				tool: toolName,
				toolInput: params
			};
		} catch (error) {
			console.error('Failed to parse tool parameters:', error);
		}
	}

	return {
		type: 'AgentFinish',
		returnValues: { output: response }
	};
}

// Modified runAgent function for Gemini
async function runAgent(state) {
	try {
		const formattedMessages = formatMessages(state);
		const result = await model.generateContent(formattedMessages);
		const response = result.response.text();
		const parsedResponse = parseToolCalls(response);

		if (parsedResponse.type === 'AgentFinish') {
			return { output: parsedResponse.returnValues.output };
		} else {
			const tool = tools.find(t => t.name === parsedResponse.tool);
			if (!tool) {
				return { output: "I couldn't find the appropriate tool to help with that." };
			}

			const observation = await tool.func(parsedResponse.toolInput);
			const newState = { ...state };
			newState.intermediate_steps.push([parsedResponse, String(observation)]);
			newState.chat_history.push(`User: ${state.input}`);
			newState.chat_history.push(`Assistant: ${response}`);
			newState.chat_history.push(`System: ${observation}`);
			return newState;
		}
	} catch (error) {
		console.error('Error in runAgent:', error);
		return { output: "I encountered an error while processing your request." };
	}
}

// Keep existing shouldContinue function
function shouldContinue(state) {
	if (state.intermediate_steps.length > 0 &&
		state.intermediate_steps[state.intermediate_steps.length - 1][0].tool === "Confirm") {
		return "end";
	}
	return "continue";
}

// Keep existing workflow setup
const workflow = new StateGraph({
	initialState: {
		input: "",
		chat_history: [],
		intermediate_steps: []
	}
});

workflow.addNode("agent", runAgent);
workflow.addConditionalEdges(
	"agent",
	shouldContinue,
	{
		"continue": "agent",
		"end": "END"
	}
);

workflow.setEntryPoint("agent");
const agentApp = workflow.compile();

// Export the agent application
module.exports = {
	agentApp,
	async handleChat(userInput) {
		const state = {
			input: userInput,
			chat_history: [],
			intermediate_steps: []
		};

		let response = { response: "" };

		for await (const output of agentApp.stream(state)) {
			if (output.output) {
				response.response = output.output;
				break;
			}
		}

		return response;
	}
}; 