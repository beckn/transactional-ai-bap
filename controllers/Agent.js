import MapsService from "../services/MapService.js";
import { TOOLS } from "../config/GPT/tools.js";
import logger from "../utils/logger.js";
import OpenAI from "openai";
import AI from "../services/AI.js";
const map = new MapsService();
const ai = new AI();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_AI_KEY,
})

const AVAILABLE_TOOLS = {
    get_routes: map.getRoutes.bind(map),
    perform_beckn_action: ai.performAction.bind(ai),
};

async function getResponse(req, res) {
    const { From, Body } = req.body
    
    // get session
    
    // get answer from AI 
    
    // save session
    
    res.send(response)
}





async function getResponseFromOpenAI(messages){
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
                const parameters = JSON.parse(tool.function.arguments);
                const functionToCall = AVAILABLE_TOOLS[tool.function.name];
                if (functionToCall) {
                    const response = await functionToCall(parameters);
                    
                    messages.push({
                        tool_call_id: tool.id,
                        role: "tool",
                        name: functionToCall,
                        content: JSON.stringify(response),
                    });

                    // call again to get the response
                    responseMessage = await getResponseFromOpenAI(messages);
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


export default {
    getResponse,
    getResponseFromOpenAI
}