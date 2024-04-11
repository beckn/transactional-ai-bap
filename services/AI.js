import { readFileSync } from 'fs';
import OpenAI from 'openai'
import logger from '../utils/logger.js'
import yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'
import search from '../schemas/jsons/search.js';
import actions from '../schemas/jsons/actions.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_AI_KEY,
})
const openai_config = JSON.parse(readFileSync('./config/openai.json'))
const registry_config = JSON.parse(readFileSync('./config/registry.json'))

class AI {
    
    constructor() {
        this.context = [];
        this.action = null;
        this.bookings = [];
    }
    
    async get_beckn_action_from_text(instruction, context=[], last_action=null){
        logger.info(`Getting action from instruction : ${instruction} and last_action is ${last_action}, context is ${JSON.stringify(context)}`);
        let response = {
            action : null
        }
        const messages = [
            { role: 'system', content: `Supported actions : ${JSON.stringify(openai_config.SUPPORTED_ACTIONS)}` },
            { role: 'system', content: `Last action : ${last_action}` },
            ...context,
            { role: "user", content: instruction }

        ];
    
        const tools = [
            {
                type: "function",
                function: {
                    name: "get_action",
                    description: "Identify if the user wants to perform an action.", 
                    parameters: actions
                }
            }
        ];
    
        try{
            const gpt_response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL_ID,
                messages: messages,
                tools: tools,
                tool_choice: "auto", 
            });
            response = JSON.parse(gpt_response.choices[0].message?.tool_calls[0]?.function?.arguments) || response;
            if(!response.action) response.action = null;
            logger.info(`Got the action : ${JSON.stringify(response)}`);
            return response
        }
        catch(e){
            logger.error(e);
            return response;
        } 
    }

    /**
     * Get response for general query
     * @param {*} instruction 
     * @param {*} context 
     * @returns 
     */
    async get_ai_response_to_query(instruction, context=[], profile = {}){
        
        const openai_messages = [
            { role: 'system', content: 'If you are asked to prepare an itinerary or plan a trip, you should have information about the user preferences such as journey dates, journey destination, number of members, mode of transport etc.'},
            { role: 'system', content: 'You must come back with a response immedietaley, do not respond back saying that you will come back with a resopnse.'},
            { role: 'system', content: `User profile : ${JSON.stringify(profile)}`},
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
                model: process.env.OPENAI_MODEL_ID,
                max_tokens: 300
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
    async get_context_by_instruction(instruction, session){
        
        const desired_structure = {
            domain:`DOMAIN_AS_PER_REGISTRY_AND_INSTRUCTION_GIVEN_BY_USER`            
        }

        let last_action_context=[];
        if(this.action?.action!=='search'){
            desired_structure.bpp_id = `<bpp_id as per user selection and last response>`;
            desired_structure.bpp_uri = `<bpp_uri as per user selection and last response>`;

            // last action context
            if(session?.profile?.last_action && session.beckn_transaction?.responses[`on_${session.profile.last_action}`]){
                last_action_context = [
                    {role: 'system', content: `Response of last action '${session.profile.last_action}' is : ${JSON.stringify(session.beckn_transaction?.responses[`on_${session.profile.last_action}`])}`},
                ]
            }            
        }
        
        let response = {
            message_id : uuidv4(),
            transaction_id: uuidv4(),
            base_url: registry_config[0].url,
            bap_id: registry_config[0].bap_subscriber_id,
            bap_uri: registry_config[0].bap_subscriber_url,
            action: this.action?.action,
            version: registry_config[0].version,
            
        }
        if(this.action.transaction_id && this.action.transaction_id!=='' && this.action.transaction_id!==null){
            response.transaction_id = this.action.transaction_id;
        }

        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the given instruction, registry details and generate a config json in the following structure : ${JSON.stringify(desired_structure)}` },
            { role: 'system', content: `Registry  : ${JSON.stringify(registry_config)}` },
            { role: 'system', content: `Instruction : ${instruction}` },
            ...last_action_context,
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
    async get_beckn_request_from_text(instruction, beckn_context={}, schema={}, session={}){

        logger.info(`get_beckn_request_from_text() : ${instruction}, for schema : ${schema} , context : ${JSON.stringify(beckn_context)}`)
        let action_response = {
            status: false,
            data: null,
            message: null
        }        

        // last action context
        let last_action_context = [];
        if(session?.profile?.last_action && session.beckn_transaction?.responses[`on_${session.profile.last_action}`]){
            last_action_context = [
                {role: 'system', content: `Response of last action '${session.profile.last_action}' is : ${JSON.stringify(session.beckn_transaction?.responses[`on_${session.profile.last_action}`])}`},
            ]
        }
        let openai_messages = [
            ...openai_config.SCHEMA_TRANSLATION_CONTEXT,
            { "role": "system", "content": `Schema definition: ${JSON.stringify(schema)}` },
            {"role": "system", "content": `User profile : ${JSON.stringify(session.profile)}`},
            ...last_action_context,
            {"role": "system", "content": `Following is the conversation history`},
            ...session?.text?.slice(-3),
            { "role": "user", "content": instruction }
        ]
        
        try{
            const completion =await openai.chat.completions.create({
                messages: openai_messages,
                model: 'gpt-4-0125-preview',
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

    async get_beckn_message_from_text(instruction, context=[], domain='', polygon=null) {
        logger.info(`get_beckn_message_from_text() : ${instruction}, for domain : ${domain} , polygon : ${polygon}`)
        let domain_context = [], policy_context = [];
        if(domain && domain!='') {
            domain_context = [
                { role: 'system', content: `Domain : ${domain}`}
            ]
            if(registry_config[0].policies.domains[domain]){
                policy_context = [
                    { role: 'system', content: `Use the following policy : ${JSON.stringify(registry_config[0].policies.domains[domain])}` }
                ]
            }
        }

        const messages = [
            ...policy_context,
            ...domain_context,
            ...context,
            { role: "user", content: instruction }

        ];
    
        const tools = [
            {
                type: "function",
                function: {
                    name: "get_search_intent",
                    description: "Get the correct search object based on user inputs", 
                    parameters: search
                }
            }
        ];
    
        try{
            // Assuming you have a function to abstract the API call
            const response = await openai.chat.completions.create({
                model: 'gpt-4-0125-preview',
                messages: messages,
                tools: tools,
                tool_choice: "auto", // auto is default, but we'll be explicit
            });
            const responseMessage = JSON.parse(response.choices[0].message?.tool_calls[0]?.function?.arguments) || null;
            logger.info(`Got beckn message from instruction : ${JSON.stringify(responseMessage)}`);
            if(this.action?.action=='search' &&  responseMessage?.intent?.fulfillment?.stops[0]?.location){
                if(polygon){
                    responseMessage.intent.fulfillment.stops[0].location.polygon = polygon;
                    const route_image = `https://maps.googleapis.com/maps/api/staticmap?size=300x300&path=color:%231d3b65|weight:5|enc:${polygon}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
                    logger.info(`Map url for request : ${route_image}`)
                    // temp
                    delete responseMessage.intent.fulfillment.stops[0].location.gps;
                }
                else delete responseMessage.intent.fulfillment.stops[0].location.polygon;
                
            }
            if(this.action?.action=='search' &&  responseMessage?.intent?.fulfillment?.stops && responseMessage?.intent?.fulfillment?.stops.length>0){
                responseMessage?.intent?.fulfillment?.stops.map(stop=>{
                    if(stop?.time?.timestamp){
                        stop.time.timestamp = new Date('2024-04-12T12:00:00Z').toISOString();
                    }
                })
            }

            return responseMessage
        }
        catch(e){
            logger.error(e);
            return null;
        }        
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
    
    
    async format_response(json_response, context=[], profile={}) {
        const desired_output = {
            status: true,
            message: "<Whastapp friendly formatted message>"
        };

        let call_to_action = {
            'search': 'You should ask which item the user wants to select to place the order. You should show search results in a listing format with important details mentioned such as name, price, rating, location, description or summary etc. and a call to action to select the item.',
            'select': 'You should ask if the user wants to initiate the order. You should not use any links from the response.',
            'init': 'You should ask if the user wants to confirm the order. ',
            'confirm': 'You should display the order id and show the succesful order confirmation message. You should ask if the user wants to book something else.',
        }

        if(!(profile.phone && profile.email && profile.name)){
            call_to_action.select+= 'Billing details are mandatory for initiating the order. You should ask the user to share billing details such as name, email and phone to iniatie the order.';
        }

        const openai_messages = [
            {role: 'system', content: `Your job is to analyse the input_json and provided chat history to convert the json response into a human readable, less verbose, whatsapp friendly message and return this in a json format as given below: \n ${JSON.stringify(desired_output)}.`},
            {role: 'system', content: `${call_to_action[json_response?.context?.action] || 'you should ask the user what they want to do next.'}`},
            // {role: 'system', content: `If the given json looks like an error, summarize the error but for humans, do not include any code or technical details. Produce some user friendly fun messages.`},
            // {role: 'system', content: `User profile : ${JSON.stringify(profile)}`},
            {role: 'assistant',content: `input_json: ${JSON.stringify(json_response)}`},
            {role: 'system', content: `Chat history goes next ....`},
            ...context.slice(-2),
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
            return {
                status:false,
                message:e.message
            }
        }
       
    }

    async get_profile_from_text(message, profile={}){
        const desired_output = {
            "name": "",
            "email": "",
            "phone": "",
            "travel_source": "",
            "travel_destination": "",
            "current_location_gps": "",
            "vehicle-type":"",
            "connector-type": "",
            "pet-friendly_yn":0,
            "ev-charging-yn":0,
            "accomodation_type":"",
            "number_of_family_members":""
        }

        const openai_messages = [
            { role: 'system', content: `Please analyse the given user message and extract profile information about the user which is not already part of their profile. The desired outout format should be the following json ${JSON.stringify(desired_output)}` },
            { role: 'system', content: `You must not send any vague or incomplete information or anything that does not tell something about the user profile.` },
            { role: 'system', content: `Return empty json if no profile information extracted.` },
            { role: 'system', content: `Existing profile : ${JSON.stringify(profile)}`},
            { role: 'user', content: message }
        ]

        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            let response = JSON.parse(completion.choices[0].message.content)            
            return {
                status: true,
                data: response
            };
        } catch (e) {
            logger.error(e)
            return {
                status:false,
                message:e.message
            }
        }
    }

    async check_if_booking_collection(message, context=[]){
        let response = false;
        const openai_messages = [
            { role: 'system', content: `Your job is to identify if the given user input is an instruction to make multiple bookings at once.` },
            { role: 'system', content: `you must return a json object with the following structure {status: true/false}` },
            { role: 'system', content: `Status must be true if the given user message is a request to make multiple bookings and the last assistant message is an itinerary or a plan. For e.g. if the assistant had shared the itinerary/plan in context and user says 'lets make the bookings' or 'make all bookings', or 'Can you make the bookings?', status should be true` },
            { role: 'system', content: `Status should be false if its not a clear instrcution to make multiple bookings. For r.g. if the user shares details about the trip, its not a clear instrcution to make bookings.` },
            { role: 'system', content: `Status should be false if the assistant has asked to select, initiate or confirm an order.` },
            { role: 'system', content: `Context goes here...` },
            ...context,
            { role: 'user', content: message }
        ]

        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            let gpt_response = JSON.parse(completion.choices[0].message.content)            
            response = gpt_response.status;
        } catch (e) {
            logger.error(e)
            
        }
        return response;
    }

    async get_bookings_array_from_text(message){
        let bookings = [];
        const desired_output = [
            {
                "name": "Hotel at xyz",
                "booked_yn": 0
            }
        ]
        const openai_messages = [
            { role: 'system', content: `You must convert the given list of bookings into the desired json array format : ${JSON.stringify(desired_output)}` },
            { role: 'user', content: message }
        ]

        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            bookings = JSON.parse(completion.choices[0].message.content)                        
        } catch (e) {
            logger.error(e)
            
        }

        logger.info(`Got bookings array : ${JSON.stringify(bookings)}`)
        return bookings;
    }

    async get_bookings_status(bookings, context){
        let bookings_updated = [];
        const openai_messages = [
            { role: 'system', content: `You must check the given list of bookings and the context history and mark the status booked_yn = 0 or 1 depending upon wether that booking has been done in the context or not.` },
            { role: 'system', content: `A booking should be considered as done if it has been confirmed or user has indicated to not book that particular item. For e.g. if the booking name is 'Accomodation at xyz' and a booking at xyz has been done in the context, its status should be marked as 1` },
            { role: 'system', content: `You must return a json array with the same format as bookings.` },
            { role: 'system', content: `Context goes here...` },
            ...context,
            { role: 'user', content: `Bookings : ${JSON.stringify(bookings)}` }
        ]

        try {
            const completion = await openai.chat.completions.create({
                messages: openai_messages,
                model: process.env.OPENAI_MODEL_ID, 
                temperature: 0,
                response_format: { type: 'json_object' },
            })
            bookings_updated = JSON.parse(completion.choices[0].message.content)                        
        } catch (e) {
            logger.error(e)
            
        }
        return bookings_updated;
    }

    async get_details_by_description(message, context=[], desired_output){
        
        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the given user input and extract details in the json format given : ${desired_output}` },
            ...context,
            { role: 'user', content: message }
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
            return {};
        }
    }
}

export default AI;