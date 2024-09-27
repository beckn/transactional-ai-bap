import NodeCache from "node-cache";
import { BECKN_ACTIONS, PROFILE_ACTIONS } from "../constant";

export interface IBecknCache {
  chats: {
    role: "model" | "user";
    text: string;
    message_id: string;
    json: string;
    action: BECKN_ACTIONS | PROFILE_ACTIONS;
  }[];
}

interface ICache {
  [key: string]: IBecknCache;
}

export const becknCache = new NodeCache();

export const setKey = (key: string, value: IBecknCache) => {
  becknCache.set(key, value);
  return becknCache.get(key);
};

export const getKey = (key: string) => {
  return becknCache.get(key);
};

export const deleteKey = (key: string) => {
  return becknCache.del(key);
};
