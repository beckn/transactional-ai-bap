import NodeCache from "node-cache";
import {
  BECKN_ACTIONS,
  CONSUMER_ACTIONS,
  DISCONTINUITY,
  PRESUMER_ACTIONS
} from "../constant";
import { ConsumerActionType } from '../constant';

export interface IBecknChat {
  role: string;
  text: string;
  message_id: string;
  json: string;
  action: ConsumerActionType | typeof BECKN_ACTIONS[keyof typeof BECKN_ACTIONS] | typeof PRESUMER_ACTIONS[keyof typeof PRESUMER_ACTIONS] | typeof DISCONTINUITY[keyof typeof DISCONTINUITY];
  flow: string;
}

export interface IBecknCache {
  chats: IBecknChat[];
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
