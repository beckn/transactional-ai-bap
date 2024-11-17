export * from "./prompts";

export const CONSUMER_ACTIONS = {
  UPLOAD_BILL: "UPLOAD_BILL",
  PROCESS_BILL: "PROCESS_BILL",
  SIGNUP: "SIGNUP",
  OTP_SENT: "OTP_SENT",
  VERIFY_OTP: "VERIFY_OTP",
  SEARCH: "SEARCH",
  SELECT: "SELECT",
  INIT: "INIT",
  CONFIRM: "CONFIRM"
} as const;

export type ConsumerActionType = typeof CONSUMER_ACTIONS[keyof typeof CONSUMER_ACTIONS];
