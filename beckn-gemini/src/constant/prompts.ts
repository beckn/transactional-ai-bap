import { Content } from "@google/generative-ai";

interface IPrefixPromptsGroup {
  [key: string]: Content[];
}

export interface IKeyValuePair {
  [key: string]: any;
}

export const prompts = {
  systemInstruction: `Your name is Elara an AI Agent Powered by Google Gemini. Beckn Open Community has created you. If Someone asks you about your origin then only tell them about your creators. Users can sell or buy energy from you. So if someone greets you then you should greet them back with your introduction and along with that add welcome message to Beckn Grid Connect. If the message is in greeting then only repond with a greeting message. You should check whether the message contains some intent to buy some energy from the open network. If there is an intent to buy or search energy providers then reply only 'make_beckn_call'. If there is no intent to buy or search energy providers then provide relevant results to the user`
};

export enum DISCONTINUITY {
  FLOW_BREAK = "FLOWBREAK",
  FLOW_BREAK_CONFIRMATION = "FLOWBREAKCONFIRMATION"
}

export enum BECKN_ACTIONS {
  search = "search",
  select = "select",
  init = "init",
  confirm = "confirm",
  status = "status"
}

export enum CONSUMER_ACTIONS {
  UPLOAD_BILL = "UPLOADBILL",
  SIGNUP = "SIGNUP",
  OTP_SENT = "OTPSENT",
  VERIFY_OTP = "VERIFYOTP"
}
export enum PRESUMER_ACTIONS {
  SELL_INTENT = "SELLINTENT",
  UPLOAD_CATALOG = "UPLOADCATALOG",
  UPLOAD_CATALOG_CONFIRMATION = "UPLOADCATALOGCONFIRMATION",
  RECURING_UPLOAD = "RECURINGUPLOAD",
  RECURING_UPLOAD_CONFIRMATION = "RECURINGUPLOADCONFIRMATION"
}

export const messages = {
  APPOLOGY_MESSAGE:
    "I sincerely apologize, but it seems I've encountered an issue processing your request. Please allow me a moment to try again or, if the issue persists, feel free to ask in another way. Your experience is important, and I appreciate your patience."
};

export const prefix_prompt_group: IPrefixPromptsGroup = {
  aiReponseFromUserPrompt: [
    {
      role: "user",
      parts: [{ text: "You are an AI Agent Helping People" }]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the message is in greeting then only repond with a greeting message"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If there is a general query related to any form of energy or energy sources then respond with relevant information in not more than 1000 characters rather than returning 'make_beckn_call'. Also add some emojis to the message"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the message means how can you help me today or what can you do for me then create a message saying I am an AI agent specially Desgined for trading on a P2P Energy network"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the message is related to trade for energy then create a message whether you want to sell or buy energy"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If there is a general query related to any form of energy or energy sources then respond with relevant information in not more than 1000 characters rather than returning 'make_beckn_call'. Also add some emojis to the message"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the query related to reduction of energy bill then return only '{'flow':'consumer', 'action':'search'}' strictly dont add code block"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If there is a specific intent to buy or search energy providers then return only '{'flow':'consumer', 'action':'search'}' strictly dont add code block"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If there is no specific intent to buy or search energy providers then provide relevant results to the user"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the message states that the user has surplus energy or want to sell some energy then return '{'flow':'presumer'}' strictly dont add code block"
        }
      ]
    }
  ],
  aiApologyMessage: [
    {
      role: "user",
      parts: [
        {
          text: "Generate a polite 2 line apology message with some emoji saying some error occured in AI engine. Please retry"
        }
      ]
    }
  ],
  aiListOfSearchItem: [
    {
      role: "model",
      parts: [{ text: "You are an AI Bot Helping People" }]
    },
    {
      role: "model",
      parts: [
        {
          text: "Create a meaningfull human friendly message from the provided json"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If the responses object is not empty then create message in an ordered list format for the providers along with the details of the quantity and price"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If the responses object is empty then reply only 'Found a list of Household supplying energy'"
        }
      ]
    }
  ],
  aiSearchingOnOpenNetwork: [
    {
      role: "user",
      parts: [
        {
          text: "Create some short 1 line message with some emoji related to grid stating searching something on open network"
        }
      ]
    }
  ],
  aiSignupAsk: [
    {
      role: "model",
      parts: [
        {
          text: "You must not introduce your self or create an introduction message"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Without any error You must have to Create a 2 line message stating that I have processed your bill and found that your distribution company has a P2P energy trading system. This will allow you to buy solar energy from local producers. Do you want to signup for it?"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "You must add keyword Signup with a confirmation prompt somewhere in the message"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Don't return make_beckn_call"
        }
      ]
    }
  ],
  aiDetectGreeting: [
    {
      role: "model",
      parts: [
        {
          text: "Identify whether the provided message is a greeting message or not"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If it is a greeting message return 'true' else 'false'"
        }
      ]
    }
  ],
  aiDetectOTPSent: [
    {
      role: "model",
      parts: [
        {
          text: "You should analyze conversation provided in json format from the text attributes, whether OTP is sent to registered to mobile number"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If provided return 'true' else return 'false'"
        }
      ]
    }
  ],
  aiCreateOTPSentMessage: [
    {
      role: "model",
      parts: [
        {
          text: "You must create a message similar to 'You will need to enter the 6 digit OTP sent to your registered mobile to sign up'"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "You should not create any other message"
        }
      ]
    }
  ],
  aiUploadBill: [
    {
      role: "model",
      parts: [
        {
          text: "Create a message Requesting the user to upload their latest electicity bill as it is mandatory to start buying electricity from P2P source"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "The message should be polite, simple and in 1 line. Don't add quotes"
        }
      ]
    }
  ],
  aiImageProcess: [
    {
      role: "model",
      parts: [
        {
          text: "You Must process the image provided in form of encoded data and detail of the content of the image in english language without any error"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "User will upload image of an electricity bill it will be printed on white paper and must have keywords like electricity, electricity bill, units, . You must return a response related to image details and nothing else"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Process the image and identify the text content of image"
        }
      ]
    }
  ],
  aiCheckAcceptance: [
    {
      role: "model",
      parts: [
        {
          text: "Analyze the message and identify if user wants to continue the transaction"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Message could be anything like yes, sure, go ahead, confirm, yo or any keyword which denotes user acceptance"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If acceptance then return '{'acceptance':'true'}' else return '{'acceptance':'false'}' strictly dont add code block"
        }
      ]
    }
  ],
  aiSendOTPMessage: [
    {
      role: "model",
      parts: [
        {
          text: "You must Create a Message requesting user to enter the 6 digit OTP(One Time Password) sent on their registered mobile number"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Do not create any error and Message should be simple and in 1 line."
        }
      ]
    }
  ],
  aiDetectOTP: [
    {
      role: "model",
      parts: [
        {
          text: "Validate the message 6 digit number"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "if valid return true else return false"
        }
      ]
    }
  ],
  aiInvalidOTP: [
    {
      role: "model",
      parts: [
        {
          text: "Create a message Telling the user the OTP is invalid"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Ask them to re-enter the 6 digit OTP"
        }
      ]
    }
  ],
  aiValidOTP: [
    {
      role: "model",
      parts: [
        {
          text: "Create a message Stating the user that OTP is correct and you are fetching their usage profile data from the distribution company"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "Message should be simple and do not surround the message with quotation"
        }
      ]
    }
  ],
  aiUsageProfileDetails: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message saying that based on your usage profile and the rules of your distribution company, you can buy upto x units of power from these rooftop units between 10 AM and 5 PM tomorrow. Do you want me to set this up ?"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Make sure the the value of x is randomized between 8 and 15"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Make sure the time is 10am to 5pm"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Make sure the message should ask user's permission to set this up at the end of message"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "You must create a message without any error and not return make_beckn_call and return the data in json format like this {'message':message created by you,'units':units present in the message}"
        }
      ]
    }
  ],
  aiSearchIntent: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message saying that Allow me a moment to search for some energy generate by nearby households that are selling energy on lower rates"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Add some 2 to 3 words appreciation for the users decision to buy energy through this process in the start of message"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should be simple and of 2 lines only and you must not add make_beckn_call anywhere in the message"
        }
      ]
    }
  ],
  aiBecknOnSearch: [
    {
      role: "user",
      parts: [
        {
          text: "Analyze the json provided and check for the responses array"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the responses array in the becknSearchResponse property is empty then create a message similar to Sorry No nearby household energy source found"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the responses array in the becknSearchResponse property is not empty and the sum of items[0].quantity.available.count of all objects in providers array is greater than units provided in the json root then create a message similar to Success! I’ve found a household with surplus solar power that can sell you energy and also at a lower rate than your discom. Would you like me to set it up?. Else create a message saying that Lower energy is found. Would you like me to set it up?"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Make sure the message should ask user's permission to set this up at the end of message"
        }
      ]
    }
  ],
  aiSelectIntent: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message similar to Perfect! I’m booking x units of electricity. It will be adjusted against your usage between 10 AM and 5 PM. This will save you around y Rs."
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The value of x will be the number of units passed in the message and value of y will be x multiplied by 1.5"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should be simple and of 2 lines only and you must not add make_beckn_call anywhere in the message"
        }
      ]
    }
  ],
  aiBeautifyQuote: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message to present the quote provided in json format in an invoice format ready to be shared over messages and there should not be any alignment issue"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The title of the invoice will be P2P Trading Bill "
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "dont make any change to the calculation and do not return response in json format"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Add a message to next line seeking persmission to proceed further"
        }
      ]
    }
  ],
  aiBecknOnInit: [
    {
      role: "user",
      parts: [
        {
          text: "Analyze the json provided and check whether the responses array in the becknInitResponse property is empty or not"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If responses array is not empty then Create a message similar to Great! Here is the QR code for you to approve the payment. The actual payment will be made tomorrow evening after the power has been supplied. Else Create a message to convey the user that there is some issue while processing their order"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should be simple"
        }
      ]
    }
  ],
  aiBecknOnConfirm: [
    {
      role: "user",
      parts: [
        {
          text: "Analyze the json provided and check whether the responses array in becknConfirmResponse property is empty or not"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If responses array is not empty then Create a message similar to Thanks for approving the payment. You are now using solar energy and have saved x Rs in doing so. The more you use, the more you save. Do you want me to do this again tomorrow. Else Create a message to convey the user that there is some issue while processing their order"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The value of x units passed in message multiplied by 1.5"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should be simple "
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Add a message seeking permission to do this process again everyday at the last of message"
        }
      ]
    }
  ],
  aiCheckRecurrignPurchaseAcceptance: [
    {
      role: "user",
      parts: [
        {
          text: "Analyze the message and identify whether the message summarize to a yes response or no response"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If yes then create a message similar to this I’ll set that up for you! I’ll keep finding the best deals everyday to help you save even more on your energy bills. "
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Else create a message thanking the user for completing the transaction on the platform. And ask the user to reach out again in future for P2P Energy Trading"
        }
      ]
    }
  ],
  aiUnitsToSell: [
    {
      role: "user",
      parts: [
        {
          text: "You must create a message which means you are ready to help with selling of energy and ask how much units you want to sell per day"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should be simple and of 1-2 lines"
        }
      ]
    }
  ],
  aiCheckSellDetails: [
    {
      role: "user",
      parts: [
        {
          text: "You should analyze the message and check the number of units of energy user wants to sell"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the message does not contain any details related to number of units and also the message does not contains only number then return 'false' else return json fomatted data in this format {units: number of units}"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "You should not return any other message"
        }
      ]
    }
  ],
  aiAskCatalogListing: [
    {
      role: "user",
      parts: [
        {
          text: "You should create a message asking permission to list it as available for transactions"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should be simple, in 1 line and in a question format"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "You should only create a relevant message"
        }
      ]
    }
  ],
  aiSuccessCatalogListing: [
    {
      role: "user",
      parts: [
        {
          text: "You should create a success message saying message similar to energy listed will let you know once it is sold"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Message should be simple and of 1 line and add some relevant emoji"
        }
      ]
    }
  ],
  aiFailCatalogListing: [
    {
      role: "user",
      parts: [
        {
          text: "You should create a sorry message by analyzing the context of the message provided"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Message should be simple and of 1 line and add some relevant emoji"
        }
      ]
    }
  ],
  aiDiscontinueFlowMessage: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message asking the user that the he has entered ir-relevant reponse or rejected the transation and whether he or she wants to stop the ongoing flow."
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Dont create a message asking the user whether you want to continue or stop the transatcion. Just add a message asking wherther you want to stop the transaction"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Message should be simple and of 2 line and add some relevant emoji"
        }
      ]
    }
  ],
  aiDiscontinueFlowConfirmMessage: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message Saying the current flow is disconinued. Thanks for Communicating with us"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Message should be simple and of 1 line and add some relevant emoji"
        }
      ]
    }
  ],
  aiRollbackToPrevState: [
    {
      role: "user",
      parts: [
        {
          text: "Create a message stating that Sure you can continue from where you left"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Message should be joyful, simple and of 1-2 line and add some relevant emoji"
        }
      ]
    }
  ],
  aiImageProcessedMessage: [
    {
      role: "user",
      parts: [
        {
          text: "Format this text which contains a information of an electicity bill"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "If the text passed does not cotain any keywords related to electricity bill like tariff, units, energy, amount,account number, energy consumption, billing period, due date, etc then return 'Not an electricity bill' else return the created message along with that inform the user that after processing the bill you found these details"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "Message should not be more than 1400 characters and the message should not be a json object it must be a Human redable message"
        }
      ]
    }
  ],
  aiWrongImageMessage: [
    {
      role: "user",
      parts: [
        {
          text: "Create a polite message stating the user that the uploaded image does not resembles an electricity bill please create a relevant electricity bill"
        }
      ]
    },
    {
      role: "user",
      parts: [
        {
          text: "The message should not be of 1-2 line and create an unique message every time and add relevant emojis"
        }
      ]
    }
  ]
};
