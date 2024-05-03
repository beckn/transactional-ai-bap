import { readFileSync } from 'fs';
import OpenAI from 'openai'
import logger from '../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'
import Actions from './Actions.js';
import { TOOLS } from '../config/GPT/tools.js';

// TODO: Load schemas. This needs to be improved so that any new schema is automatically loaded
import search from '../config/schemas/search.js';
import select from '../config/schemas/select.js';
import init from '../config/schemas/init.js';
import confirm from '../config/schemas/confirm.js';
import get_text_by_key from '../utils/language.js';
import { EMPTY_SESSION } from '../config/constants.js';
const BECKN_ACTIONS = {
    search: {
        schema : search, call_to_action : "Which one would you like to select?"
    },
    select: {
        schema: select, call_to_action: "Would you like to initiate the order?"
    },
    init: {
        schema: init, call_to_action: "Would you like to confirm the order?"
    },
    confirm: {
        schema: confirm, call_to_action: "Your order is confirmed with order id <ORDER_ID>. Would you like to order something else?"
    }
}
const NUMBER_OF_RETRIES=3;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_AI_KEY,
})
const registry_config = JSON.parse(readFileSync('./config/registry.json'))

class AI {
    
    constructor() {
        this.context = [];
        this.action = null;
        this.bookings = [];
        this.actionService = new Actions();
        this.session = EMPTY_SESSION;
        this.tools = [];
        this.attempt = 0; // for API call attempts
    }
    
    /**
     * This function takes a list of messages and returns the response from the AI model
     * It also checks for tool calls and executes them if found
     * @param {*} messages | array of messages to be sent to the AI model in the format [{role: 'user', content: 'message'}, {role: 'assistant', content: 'message'}]
     * @param {*} raw_yn | If this paramater is true, the function will return raw json response for tool calls
     * @returns 
     */
    async get_response_or_perform_action(messages, raw_yn=false){

        if(messages.length==0) return false; // no messages to process

        const context = [
            {role: 'assistant', content : "You are a travel planner ai agent that is capable of performing actions. "},
            {role: 'assistant', content : "You can only share results immediately, so you should never say that you will do something in the future. "},
            {role: 'assistant', content : "If the last tool call did not produce any useful response, you should convey that directly."},
            {role: 'assistant', content : "Your tone should be polite and helpful. "},
    
        ]
        try{
            const gpt_response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL_ID,
                messages: [...context, ...messages],
                tools: TOOLS,
                tool_choice: "auto", 
            });
            let responseMessage = gpt_response.choices[0].message;
    
            // check for tool calls
            const toolCalls = responseMessage.tool_calls;
            if (toolCalls) {
                logger.info("Tool calls found in response, proceeding...");
    
    
                messages.push(responseMessage);
                
                for (let tool of toolCalls) {
                    logger.warn(`Executing tool : ${tool.function.name} ...`);
                    const parameters = JSON.parse(tool.function.arguments);
                    const functionToCall = this.tools[tool.function.name];
                    if (functionToCall) {
                        const response = await functionToCall(parameters);
                        
                        messages.push({
                            tool_call_id: tool.id,
                            role: "tool",
                            name: functionToCall,
                            content: JSON.stringify(response),
                        });
    
                        // call again to get the response
                        responseMessage = await this.get_response_or_perform_action(messages);
                        if(raw_yn) {
                            responseMessage.raw = response.data;
                        }
                    }
                }
            }
            
            return responseMessage;
            
        }
        catch(e){
            logger.error(e);
            return false;
        } 
    }

    /**
     * This function performs a beckn transaction by calling the beckn API and returns the response form API call
     * @param {*} param0 | action and instruction
     * @returns 
     */
    async perform_beckn_transaction({action, instruction}){
        logger.info(`perform_beckn_transaction() : ${action}, ${instruction}`);
        let response = {
            status: false,
            data: null,
            message: null
        }

        try{

            let context = {};
            let message = {};
            let api_response = {};
            
            // get context
            let attempt = 0;
            while(attempt<NUMBER_OF_RETRIES){
                logger.warn(`Getting context for action : ${action} | Attempt : ${attempt+1}`);
                context = await this.get_context_by_action(action, instruction);
                logger.info("Got context!");
                if(context) break;
                attempt++;
            }

            // get message
            attempt = 0;
            while(attempt<NUMBER_OF_RETRIES){
                logger.warn(`Getting message for action : ${action} | Attempt : ${attempt+1}`);
                message = await this.get_message_by_action(action, instruction, context.domain);
                logger.info("Got message!");
                if(message) break;
                attempt++;
            }

            // call API
            logger.warn(`Calling API for action : ${action} | Attempt : ${this.attempt+1}`);
            const url = `${context.base_url}/${action}`;
            const request = {context: context, message: message};
            api_response = await this.actionService.call_api(url, 'POST', request);
            logger.info("Got API response!");
            
            if(api_response?.status && api_response?.data?.responses?.length>0){
                response={
                    status: true,
                    data: api_response?.data?.responses,
                    message: api_response.data.responses.length>0 ? BECKN_ACTIONS[action]['call_to_action'] : "No response found for the given action"
                }
    
                
                // update last action and response
                if(api_response?.data?.responses?.length>0){
                    this.session.profile.last_action = action;
                    this.session.beckn_transaction.responses[action] = request;
                    this.session.beckn_transaction.responses[`on_${action}`] = api_response.data.responses;
                }
            }
            else if(this.attempt<NUMBER_OF_RETRIES){
                // retry if api resopnse is not received
                this.attempt++;
                logger.warn(`Retrying perform_beckn_transaction() for action : ${action} | Attempt : ${this.attempt+1}...`);
                response = await this.perform_beckn_transaction({action, instruction});
            }
            else{
                throw new Error(get_text_by_key('api_call_failed'));
            }
        }
        catch(e){
            logger.error(e);
            response.message = e.message;
        }

        return response;
    }

    async get_context_by_action(action, instruction){
        
        const desired_structure = {
            domain:`DOMAIN_AS_PER_REGISTRY_AND_INSTRUCTION_GIVEN_BY_USER`            
        }

        let last_action_context=[];
        if(action!='search'){
            desired_structure.bpp_id = `<bpp_id as per user selection and last response>`;
            desired_structure.bpp_uri = `<bpp_uri as per user selection and last response>`;

            // last action context
            if(this.session?.profile?.last_action && this.session.beckn_transaction?.responses[`on_${this.session.profile.last_action}`]){
                last_action_context = [
                    {role: 'system', content: `Response of last action '${this.session.profile.last_action}' is : ${JSON.stringify(this.session.beckn_transaction?.responses[`on_${this.session.profile.last_action}`])}`},
                ]
            }
        }
        
        let response = {
            message_id : uuidv4(),
            transaction_id: uuidv4(),
            base_url: registry_config[0].url,
            bap_id: registry_config[0].bap_subscriber_id,
            bap_uri: registry_config[0].bap_subscriber_url,
            action: action,
            version: registry_config[0].version,            
        }

        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the given instruction, registry details and generate a config json in the following structure : ${JSON.stringify(desired_structure)}` },
            { role: 'system', content: `Registry  : ${JSON.stringify(registry_config)}` },
            ...last_action_context,
            { role: 'system', content: `Instruction : ${instruction}` }
        ]

        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            let gpt_response = JSON.parse(completion.choices[0].message.content)
            response = {...response, ...gpt_response};            
            logger.verbose(`Got context from instruction : ${JSON.stringify(response)}`);
            return response;
        } catch (e) {
            logger.error(e)
            return {}
        }
    }

    async get_message_by_action(action, instruction, domain=null) {
        logger.info(`get_message_by_action() : ${action}, ${instruction}`)
        
        const messages = [
            { role: "assistant", content: `Current date is ${new Date().toISOString()}` },
            { role: "user", content: instruction }
        ];

        // Add domain context
        let domain_context = [];
        if(domain && registry_config[0].policies.domains[domain]){
            domain_context = [
                { role: 'system', content: `Domain : ${domain}`},
                { role: 'system', content: `Use the following policy : ${JSON.stringify(registry_config[0].policies.domains[domain])}` }
            ]            
        }

        // last action context
        let last_action_context=[];
        if(action!='search'){
            // last action context
            let prefix = this.session?.profile?.last_action=='search' ? 'on_' : '';
            if(this.session?.profile?.last_action && this.session.beckn_transaction?.responses[`${prefix}${this.session.profile.last_action}`]){
                last_action_context = [
                    {role: 'system', content: `Payload of '${prefix}${this.session.profile.last_action}' is : ${JSON.stringify(this.session.beckn_transaction?.responses[`${prefix}${this.session.profile.last_action}`])}`},
                ]
            }
        }

        // Add profile context
        let profile_context = [];
        if(this.session?.profile){
            profile_context = [
                { role: 'system', content: `User profile : ${JSON.stringify(this.session.profile)}` }
            ]
        }
    
        const schema = BECKN_ACTIONS[action]['schema'];

        const tools = [
            {
                type: "function",
                function: {
                    name: "get_message",
                    description: "Get the correct message object based on user instructions", 
                    parameters: schema
                }
            }
        ];
    
        try{
            // Assuming you have a function to abstract the API call
            const response = await openai.chat.completions.create({
                model: 'gpt-4-0125-preview', //process.env.OPENAI_MODEL_ID,
                messages: [
                    ...domain_context,
                    ...last_action_context,
                    ...profile_context,
                    ...messages],
                tools: tools,
                tool_choice: "auto", // auto is default, but we'll be explicit
            });
            let responseMessage = JSON.parse(response.choices[0].message?.tool_calls[0]?.function?.arguments) || null;

            responseMessage = await this._cleanup_beckn_message(action, responseMessage);

            logger.verbose(`Got beckn message from instruction : ${JSON.stringify(responseMessage)}`);
            

            return responseMessage
        }
        catch(e){
            logger.error(e);
            return null;
        }        
    }

    async _cleanup_beckn_message(action, message){
        // cleanup polygon
        if(action=='search' && message?.intent?.fulfillment?.stops){
            for(let stop of message.intent.fulfillment.stops){
                if(stop.location?.polygon){
                    delete stop.location?.gps;
                }
            }
        }
        
        // update message for init and confirm. Cleanup incorrect `items` for init and incorrect `items` and `billing` details for confirm
        if((action=='init' || action=='confirm') && this.session?.beckn_transaction?.responses[this.session?.profile?.last_action]){
            message.order = {
                ...message.order,
                ...this.session?.beckn_transaction?.responses[this.session?.profile?.last_action]?.message?.order
            }
        }

        return message;
    }    

}

export default AI;