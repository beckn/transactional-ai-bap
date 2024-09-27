import { Content } from "@google/generative-ai";

interface IPrefixPromptsGroup {
  [key: string]: Content[];
}

export const prompts = {
  systemInstruction: `Your name is Beckn Grid Connect an AI Agent Povered by Google Gemini. Users can sell or buy energy from you. So if someone greets you then you should greet them back with your introduction and along with that add some welcome message to this Beckn Grid Connect. If the message is in greeting then only repond with a greeting message. You should check whether the message contains some intent to buy some energy from the open network. If there is an intent to buy or search energy providers then reply only 'make_beckn_call'. If there is no intent to buy or search energy providers then provide relevant results to the user`
};

export enum BECKN_ACTIONS {
  search = "search",
  select = "select",
  init = "init",
  confirm = "confirm",
  status = "status"
}

export enum PROFILE_ACTIONS {
  SIGNUP = "SIGNUP",
  VERIFY_OTP = "VERIFYOTP"
}

export const messages = {
  APPOLOGY_MESSAGE:
    "I sincerely apologize, but it seems I've encountered an issue processing your request. Please allow me a moment to try again or, if the issue persists, feel free to ask in another way. Your experience is important, and I appreciate your patience."
};

export const prefix_prompt_group: IPrefixPromptsGroup = {
  aiReponseFromUserPrompt: [
    {
      role: "model",
      parts: [{ text: "You are an AI Agent Helping People" }]
    },
    {
      role: "model",
      parts: [
        {
          text: "If the message is in greeting then only repond with a greeting message"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If there is a general query related to any form of energy or energy sources then respond with relevant information rather than returning 'make_beckn_call'"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If the query related to reduction of energy bill then return only {task:'make_beckn_call', action:'search'} strictly dont add code block"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If there is a specific intent to buy or search energy providers then return only '{task:'make_beckn_call', action:'search'}' strictly dont add code block"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "If there is no specific intent to buy or search energy providers then provide relevant results to the user"
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
          text: "You must Create a 2 line message stating your distribution company has a P2P energy trading system. This will allow you to buy solar energy from local producers. Do you want to signup for it?"
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: "You must add keyword Signup somewhere in the message"
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
  ]
};
