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
    }
    
    /**
    * Function to retuen a beckn action from given text. 
    * It should return a chat completion response if no action is found.
    * @param {*} text 
    * @returns 
    */
    async get_beckn_action_from_text(text, context=[]){
        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the text input given by user and identify if that is an action based on given descriptions. The supported actions with their descriptions are : ${JSON.stringify(openai_config.SUPPORTED_ACTIONS)}.` }, 
            { role: 'system', content: `You must return a json in the following format {'action':'SOME_ACTION_OR_NULL', 'reason': 'Reason for miss'}` },
            { role: 'system', content: `Following is the context history for reference.` },
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
        return response;
    }

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
        return response;
    }
    
    async get_beckn_request_from_text(instruction, context=[]){
        let action_response = {
            status: false,
            data: null,
            message: null
        }
        
        // get the right/compressed schema
        const schema_response = await this._get_schema_by_instruction(instruction, context)
        logger.info(`Got schema details, preparing payload using AI...`)
        const schema = schema_response.data;

        // If its a valid action
        if(schema_response.status){
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
                    ...schema_response.data.config
                };
                response.url = `${schema_response.data.config.base_url}/${response.body.context.action}`

                action_response = {...action_response, status: true, data: response}
            }
            catch(e){
                logger.error(e);
                action_response = {...action_response, message: e.message}
            }
        }
        else{
            action_response = {...action_response, message: schema_response.message}
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
    
    async _get_schema_by_instruction(instruction, context=[]) {
        let response = {
            status: false,
            data: {
                schema:null,
                config: null,
                action: null
            },
            message : null
        }

        const action = await this.get_beckn_action_from_text(instruction, context);
        logger.info(`Got action from instruction : ${JSON.stringify(action)}`)
        if(action?.action){
            response.data.config = await this._get_config_by_action(action.action, instruction, context);
            logger.info(`Got config from action : ${JSON.stringify(response.data.config)}`);

            try {
                const filePath = `./schemas/core_1.1.0/${action?.action}.yml`;
                const schema = yaml.load(readFileSync(filePath, 'utf8'));
                response = {
                    ...response, 
                    status: true, 
                    data: {
                        ...response.data, 
                        schema: schema,
                        action: action.action
                    }
                }; // update schema and action
            } catch (error) {
                const defaultFilePath = './schemas/core_1.1.0.yml';
                const defaultSchema = yaml.load(readFileSync(defaultFilePath, 'utf8'));
                
                // Reduce schema
                const specificSchema = JSON.stringify(defaultSchema.paths[`/${action.action}`])
                if (specificSchema) {
                    defaultSchema.paths = {
                        [`/${action.action}`]: specificSchema,
                    }
                }
                
                response = {
                    ...response, 
                    status: true, 
                    data: {
                        ...response.data,
                        schema: defaultSchema,
                        action: action.action
                    }
                };
            }
        }
        else{
            const ai_response = await this.get_ai_response_to_query(instruction, context);
            response = {...response, message: ai_response}
        }
        return response;
    }

    async get_text_from_json(json_response, context=[], model = process.env.OPENAI_MODEL_ID) {
        const desired_output = {
            status: true,
            message: "<Whastapp friendly formatted message>"
        };
        const openai_messages = [
            {role: 'system', content: `Your job is to analyse the given json object and provided chat history to convert the json response into a human readable, less verbose, whatsapp friendly message and return this in a json format as given below: \n ${JSON.stringify(desired_output)}. If the json is invalid or empty, the status in desired output should be false with the relevant error message.`},
            {role: 'system', content: `A typical order flow on beckn is search > select > init > confirm. Please add a call to action for the next step in the message. Also, please ensure that you have billing and shipping details before calling init if not already provided in the chat history.`},
            {role: 'system', content: `you should show search results in a listing format with important details mentioned such as name, price, rating, location, description or summary etc. and a call to action to select the item. `},
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
    
    async _get_config_by_action(action, instruction, context=[]){
        
        const desired_structure = {
            action: action,
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
            { role: 'system', content: `Action : ${action}` },
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
            return response;
        } catch (e) {
            logger.error(e)
            return {}
        }
    }
}

export default AI;