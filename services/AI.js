import { readFileSync } from 'fs';
import OpenAI from 'openai'
import logger from '../utils/logger.js'
import yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_AI_KEY,
})
const openai_config = JSON.parse(readFileSync('./config/openai.json'))
const registry_config = JSON.parse(readFileSync('./config/registry.json'))

class AI {
    
    constructor() {
        this.context = [];
        this.action = null;
    }
    
    /**
     * Function to get the action from text. Works better without the context.
     * @param {*} text 
     * @param {*} context 
     * @returns 
     */
    async get_beckn_action_from_text(text, context=[]){
        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the latest user input and check if its a valid action based on the supported actions given here : : ${JSON.stringify(openai_config.SUPPORTED_ACTIONS)}` }, 
            { role: 'system', content: `You must return a json response with the following structure : {'action':'SOME_ACTION_OR_NULL'}`},
            { role: 'system', content: `'action' must be null if its not from the given set of actions.` },
            ...context,
            { role: 'user', content: text }
        ]
        
        let response = {
            action: null,
            response: null
        }
        try{
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID,
                temperature: 0,
                response_format: { type: 'json_object' }
            })
            response = JSON.parse(completion.choices[0].message.content);
        }
        catch(e){
            logger.error(e);
        }

        logger.info(`Got action from text : ${JSON.stringify(response)}`)
        return response;
    }

    /**
     * Get response for general query
     * @param {*} instruction 
     * @param {*} context 
     * @returns 
     */
    async get_ai_response_to_query(instruction, context=[]){
        const openai_messages = [
            { role: 'system', content: 'If you are asked to prepare an itinery or plan a trip, always ask for user preferences such as accommodation types, journey details, dietary preferences, things of interest, journey dates, journey destination, number of members, special requests.'},
            ...context,
            { role: 'user', content: instruction}
        ]
        
        let response = {
            action: null,
            response: null
        }
        try{
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID
            })
            response = completion.choices[0].message.content;
        }
        catch(e){
            logger.error(e);
        }

        logger.info(`Got response from AI for a general query : ${response}`)
        return response;
    }
    
    /**
     * Get the right schema for a given action
     * @returns 
     */
    async get_schema_by_action() {
        let schema = false;

        if(this.action?.action){
            try {
                const filePath = `./schemas/core_1.1.0/${this.action?.action}.yml`;
                schema = yaml.load(readFileSync(filePath, 'utf8'));
                
            } catch (error) {
                logger.error(error);
            }
        }
        else{
            logger.error(`No action found in the instance.`);
        }

        logger.info(`Found schema for action : ${this.action?.action}`)
        return schema;
    }

    /**
     * Get beckn context for a given instruction
     * @param {*} instruction 
     * @param {*} context 
     * @returns 
     */
    async get_context_by_instruction(instruction, context=[]){
        
        const desired_structure = {
            action: this.action?.action,
            version: 'VERSION_AS_PER_REGISTRY',
            domain:`DOMAIN_AS_PER_REGISTRY_AND_INSTRUCTION_GIVEN_BY_USER`,
            message_id : uuidv4(),
            transaction_id: uuidv4(),
            base_url: 'AS_PER_REGISTRY',
            bap_id: 'AS_PER_REGISTRY',
            bap_uri: 'AS_PER_REGISTRY',
        }

        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the given instruction, action and registry details and generated a config json in the following structure : ${JSON.stringify(desired_structure)}` },
            { role: 'system', content: `Registry  : ${JSON.stringify(registry_config)}` },
            { role: 'system', content: `Instruction : ${instruction}` },
            { role: 'system', content: `Action : ${this.action?.action}` },
            ...context.filter(c => c.role === 'user')
        ]

        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            let response = JSON.parse(completion.choices[0].message.content)            
            logger.info(`Got context from instruction : ${JSON.stringify(response)}`);
            return response;
        } catch (e) {
            logger.error(e)
            return {}
        }
    }

    /**
     * Get beckn payload based on instruction, hostorical context, beckn context and schema
     * @param {*} instruction 
     * @param {*} context 
     * @param {*} beckn_context 
     * @param {*} schema 
     * @returns 
     */
    async get_beckn_request_from_text(instruction, context=[], beckn_context={}, schema={}){

        logger.info(`Getting beckn request from instruction : ${instruction}`)
        let action_response = {
            status: false,
            data: null,
            message: null
        }        

        let openai_messages = [
            { "role": "system", "content": `Schema definition: ${JSON.stringify(schema)}` },
            ...openai_config.SCHEMA_TRANSLATION_CONTEXT,
            {"role": "system", "content": `Following is the conversation history`},
            ...context,
            { "role": "user", "content": instruction }
        ]
        
        try{
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID,
                response_format: { type: 'json_object' },
                temperature: 0,
            })
            const jsonString = completion.choices[0].message.content.trim()
            logger.info(`Got beckn payload`)
            logger.info(jsonString)
            logger.info(`\u001b[1;34m ${JSON.stringify(completion.usage)}\u001b[0m`)
            
            let response = JSON.parse(jsonString)
            
            // Corrections
            response.body.context = {
                ...response.body.context,
                ...beckn_context
            };
            response.url = `${beckn_context.base_url}/${beckn_context.action}`

            action_response = {...action_response, status: true, data: response}
        }
        catch(e){
            logger.error(e);
            action_response = {...action_response, message: e.message}
        }
        
        
        return action_response;
    }
    
    async compress_search_results(search_res){

        const desired_output = {
            "providers": [
                {
                    "id": "some_provider_id",
                    "name": "some_provider_name",
                    "bpp_id": "some_bpp_id",
                    "bpp_uri": "some_bpp_uri",
                    "items": [
                        {
                            "id": "some_item_id",
                            "name": "some_item_name"
                        }
                    ]
                }
            ]
        }
        let openai_messages = [
            { "role" : "system", "content": `Your job is to complress the search results received from user into the following JSON structure : ${JSON.stringify(desired_output)}`},
            { "role" : "system", "content": "bpp_id and bpp_uri for a provide must be picked up from its own context only." },
            { "role" : "system", "content": "you should not use responses or providers that do not have items." },
            { "role": "user", "content": JSON.stringify(search_res)}
        ]
        const completion = await openai.chat.completions.create({
            messages: openai_messages,
            model: process.env.OPENAI_MODEL_ID, // Using bigger model for search result compression
            response_format: { type: 'json_object' },
            temperature: 0,
        })
        const jsonString = completion.choices[0].message.content.trim()
        logger.info(jsonString)
        logger.info(`\u001b[1;34m ${JSON.stringify(completion.usage)}\u001b[0m`)
        
        const compressed = JSON.parse(jsonString)
        return {...search_res, responses: compressed};
    }
    
    
    async get_text_from_json(json_response, context=[], model = process.env.OPENAI_MODEL_ID) {
        const desired_output = {
            status: true,
            message: "<Whastapp friendly formatted message>"
        };
        const openai_messages = [
            {role: 'system', content: `Your job is to analyse the given json object and provided chat history to convert the json response into a human readable, less verbose, whatsapp friendly message and return this in a json format as given below: \n ${JSON.stringify(desired_output)}. If the json is invalid or empty, the status in desired output should be false with the relevant error message.`},
            {role: 'system', content: `User can select an item after seeing the search results or directly 'init' by selecting an item and sharing their billing details. You should ask user what they want to do next.`},
            {role: 'system', content: `If its a 'select' response, do ask for billing details to initiate the order.`},
            {role: 'system', content: `If its an 'init' response, you should ask for confirmation.`},
            {role: 'system', content: `If its a 'confirm' response, you should include the order id in your response.`},
            {role: 'system', content: `You should show search results in a listing format with important details mentioned such as name, price, rating, location, description or summary etc. and a call to action to select the item. `},
            {role: 'system', content: `If the given json looks like an error, summarize teh error but for humans, do not include any code or technical details. Produce some user friendly fun messages.`},
            ...context.filter(c => c.role === 'user'),
            {role: 'assistant',content: `${JSON.stringify(json_response)}`},
        ]
        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: model, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            let response = JSON.parse(completion.choices[0].message.content)            
            return response;
        } catch (e) {
            logger.error(e)
            return {
                status:false,
                message:e.message
            }
        }
       
    }    
}

export default AI;