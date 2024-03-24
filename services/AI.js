import { readFileSync } from 'fs';
import OpenAI from 'openai'
import logger from '../utils/logger.js'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_AI_KEY,
})
const config = JSON.parse(readFileSync('./config/openai.json'))

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
    async get_beckn_action_from_text(text){
        const openai_messages = [
            { role: 'system', content: `Your job is to analyse the text input given by user and identify if that is an action based on given set of actions. The supported actions with their descriptions are : ${JSON.stringify(config.SUPPORTED_ACTIONS)}.` }, 
            { role: 'system', content: `You must return a json in the following format {'action':'SOME_ACTION_OR_NULL', 'response': 'Should be reponse based on the query.'}` },
            { role: 'system', content: `If the instruction is an action, the action key should be set under 'action' otehrwise action should be null and response should contain completion for the given text.` }, 
            { role: 'system', content: `If you are asked to prepare an itinery or plan a trip, always ask for user preferences such as accommodation types, journey details, dietary preferences, things of interest, journey dates, journey destination, number of members, special requests.` }, 
            { role: 'user', content: text}
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
}

export default AI;