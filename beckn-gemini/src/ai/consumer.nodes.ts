import { Annotation } from "@langchain/langgraph";
import { makeBecknCall } from "../beckn/services";
import { generateQRCode } from "../utils/qr-code-utils";
import { createQuote } from "../utils/quote-utils";
import { BECKN_ACTIONS, CONSUMER_ACTIONS, DISCONTINUITY, prefix_prompt_group } from '../constant';
import { BaseMessage, AIMessage, SystemMessage } from './types';
import { 
  createSession, 
  deleteSession, 
  getAiReponseFromPrompt, 
  getSession,
  imageRecognition,
  updateSession
} from './services';
import { sendResponseToWhatsapp } from '../twilio/services';
import { IBecknCache, IBecknChat } from "../cache";


export const CONSUMER_NODES = {
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
  WAIT_FOR_RECURRING_PURCHASE: "wait_for_recurring_purchase",
  RECURRING_PURCHASE: "recurring_purchase",
  WAIT_FOR_FLOW_BREAK_CONFIRMATION: "wait_for_flow_break_confirmation"
} 

// Add consumer flow state annotation
export const ConsumerStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  }),
  whatsappNumber: Annotation<string>(),
  session: Annotation<any>(),
  mediaUrl: Annotation<string>(),
  billData: Annotation<string>()
});


const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


export async function checkSession(state: typeof ConsumerStateAnnotation.State) {
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



export async function processBill(state: typeof ConsumerStateAnnotation.State) {
	console.log("Consumer Flow 3 - Processing bill", state);
	
	if (!state.mediaUrl) {
		return {
			...state,
			messages: [...state.messages, new AIMessage("No bill image provided")]
		};
	}

	const imageData = await imageRecognition(state.mediaUrl);

 
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

export async function handleSignup(state: typeof ConsumerStateAnnotation.State) {
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

export async function sendOtp(state: typeof ConsumerStateAnnotation.State) {
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
export async function handleFlowBreak(state: typeof ConsumerStateAnnotation.State) {
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




export async function handleFlowBreakConfirmation(state: typeof ConsumerStateAnnotation.State) {
	// User confirmed discontinuation
	console.log("Consumer Flow - Handling Flow Break Confirmation");

	return {
		...state,
		messages: [...state.messages],
	};
}


// Add verify OTP node
export async function verifyOtp(state: typeof ConsumerStateAnnotation.State) {

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
export async function becknSearch(state: typeof ConsumerStateAnnotation.State) {
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
					action: CONSUMER_ACTIONS.SEARCH,
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


// Add the beckn select node function
export async function becknSelect(state: typeof ConsumerStateAnnotation.State) {
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
		(chat: IBecknChat) => chat.action === CONSUMER_ACTIONS.SEARCH
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
					action: CONSUMER_ACTIONS.SELECT,
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


// Add the beckn init and confirm node function
export async function becknInitAndConfirm(state: typeof ConsumerStateAnnotation.State) {
	const selectStep = state.session.chats.find(
		(chat: IBecknChat) => chat.action === CONSUMER_ACTIONS.SELECT
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
					action: CONSUMER_ACTIONS.INIT,
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
					action: CONSUMER_ACTIONS.CONFIRM,
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



// Add the recurring purchase node function
export async function handleRecurringPurchase(state: typeof ConsumerStateAnnotation.State) {
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



// ****************************************** Wait Nodes handlers ******************************


export async function generateWaitNodeHandler(name: string) {
	return async (state: typeof ConsumerStateAnnotation.State) => {
		console.log(`Consumer Flow - Generating wait node handler for ${name}`);
		return {
			...state,
			messages: [...state.messages, new SystemMessage(`Waiting for ${name} confirmation`)]
		};
	};
}

export async function waitForInit(state: typeof ConsumerStateAnnotation.State) {
	console.log("Consumer Flow - Waiting for init confirmation");
	return {
		...state,
		messages: [...state.messages, new SystemMessage("Waiting for init confirmation")]
	};
}

export async function waitForRecurringPurchase(state: typeof ConsumerStateAnnotation.State) {
	console.log("Consumer Flow - Waiting for recurring purchase confirmation");
	return {
		...state,
		messages: [...state.messages, new SystemMessage("Waiting for recurring purchase confirmation")]
	};
}

// Add wait for select node
export async function waitForSelect(state: typeof ConsumerStateAnnotation.State) {
	console.log("Consumer Flow - Waiting for select confirmation");
	return {
		...state,
		messages: [...state.messages, new SystemMessage("Waiting for select confirmation")]
	};
}

export async function waitForSearch(state: typeof ConsumerStateAnnotation.State) {
	console.log("Consumer Flow - Waiting for search confirmation");
	return {
		...state,
		messages: [...state.messages, new SystemMessage("Waiting for search confirmation")]
	};
}

  // Add wait for flow break confirmation node
	export async function waitForFlowBreakConfirmation(state: typeof ConsumerStateAnnotation.State) {
    console.log("Consumer Flow - Waiting for flow break confirmation");
    return {
      ...state,
      messages: [...state.messages, new SystemMessage("Waiting for flow break confirmation")]
    };
  }

	// Add wait for OTP node
export async function waitForOtp(state: typeof ConsumerStateAnnotation.State) {
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

export async function waitForBillUpload(state: typeof ConsumerStateAnnotation.State) {
	console.log("Consumer Flow 2 - Waiting for bill upload");
	// This node acts as a human feedback point
	// The state will be saved here and resumed when user uploads bill
	return {
		...state,
		messages: [...state.messages, new SystemMessage("Waiting for bill upload")]
	};
}
