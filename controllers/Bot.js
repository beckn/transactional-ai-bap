import ActionsService from '../services/Actions.js'
import AI from '../services/AI.js'
import DBService from '../services/DBService.js'
import logger from '../utils/logger.js'

const actionsService = new ActionsService()
const db = new DBService();

/**
 * Function to process any text message received by the bot
 * @param {*} req 
 * @param {*} res 
 */
async function process_text(req, res) {
    let ai = new AI();
    
    // inputs
    const message = req.body.Body
    const sender = req.body.From
    const format = req.headers['content-type'] || 'text/xml';
    const raw_yn = req.body.raw_yn || false;
    
    let response= {
        raw: null,
        formatted: null
    };
    
    const EMPTY_SESSION = {
        profile:{
            misc: {}
        },
        sessionId: sender,
        text : [],
        actions : {
            raw: [],
            formatted: []
        }
    }
    
    logger.info(`Received message from ${sender}: ${message}. Response format: ${format}`)
    
    // get or create session
    const  session_response = await db.get_session(sender);
    let session = session_response.data;
    if(!session_response.status){
        session = EMPTY_SESSION
    }
    
    try{

        // Get profile
        const profileResponse = await ai.get_profile_from_text(message, session.profile);
        if(profileResponse.status){
            session.profile = {
                ...session.profile, 
                ...profileResponse.data,
                misc: {
                    ...session.profile.misc,
                    ...profileResponse.data.misc
                }
            };
        }

        logger.info(`\u001b[1;34m Profile: ${JSON.stringify(session.profile)}\u001b[0m`);

        // get action
        ai.action = await ai.get_beckn_action_from_text(message, session.actions.formatted);

        // Reset actions context if action is search
        if(ai.action?.action === 'search') {
            session.actions = EMPTY_SESSION.actions;
        }
        

        if(ai.action?.action === 'clear_chat'){
            session = {
                ...EMPTY_SESSION,
                profile: session.profile
            };
            response.formatted = 'Session cleared! You can start a new session now.';
        }
        else if(ai.action?.action === 'clear_all'){
            session = EMPTY_SESSION;
            response.formatted = 'Session & profile cleared! You can start a new session now.';
        }
        else if(ai.action?.action == null) {
            // get ai response
            response.formatted = await ai.get_ai_response_to_query(message, session.text);
            logger.info(`AI response: ${response.formatted}`);
        }
        else{
            response = await process_action(ai.action, message, session, sender, format);
            
            // update actions
            if(response.formatted && response.raw){
                session.actions.raw.push({ role: 'user', content: message }); 
                session.actions.raw.push({ role: 'assistant', content: JSON.stringify(response.raw)}); 
                
                session.actions.formatted.push({ role: 'user', content: message }); 
                session.actions.formatted.push({ role: 'assistant', content: response.formatted }); 
            }
        }
        
        // update session
        session.text.push({ role: 'user', content: message }); 
        session.text.push({ role: 'assistant', content: response.formatted });

        // update session
        await db.update_session(sender, session);
        
        // Send response
        if(format!='application/json'){
            actionsService.send_message(sender, response.formatted)
            res.send("Done!")
        }
        else (raw_yn && response.raw) ? res.send(response.raw) : res.send(response.formatted)
        
    }
    catch(e){
        logger.error(`Error processing message: ${e.message}`)
        res.status(400).send('Failed to process message')
    }
    
}

/**
 * Function to process actions, it does not update the sessions
 * Can be reused by gpt bots if required
 * @param {*} action 
 * @param {*} text 
 * @param {*} session 
 * @returns 
 */
async function process_action(action, text, session, sender=null, format='application/json'){
    let ai = new AI();
    let response = {
        raw: null,
        formatted: null
    }
    
    ai.action = action;
    
    
    format!='application/json' && actionsService.send_message(sender, `_Please wait while we process your request through open networks..._`)
            
    // Get schema
    const schema = await ai.get_schema_by_action(action.action);
    
    // Get config
    const beckn_context = await ai.get_context_by_instruction(text, session.actions.raw);
    
    // Prepare request
    if(schema && beckn_context){
        const request = await ai.get_beckn_request_from_text(text, [...session.text, ...session.actions.raw], beckn_context, schema, session.profile);
        
        if(request.status){
            // call api
            const api_response = await actionsService.call_api(request.data.url, request.data.method, request.data.body, request.data.headers)
            format!='application/json' && actionsService.send_message(sender, `_Your request is processed, generating a response..._`)
            if(!api_response.status){
                response.formatted = `Failed to call the API: ${api_response.error}`
            }
            else{
                response.raw = request.data.body.context.action==='search' ? await ai.compress_search_results(api_response.data) : api_response.data
                const formatted_response = await ai.get_text_from_json(
                    api_response.data,
                    [...session.actions.formatted, { role: 'user', content: text }],
                    session.profile
                );
                response.formatted = formatted_response.message;
            }            
        }
        else{
            response.formatted = "Could not prepare this request. Can you please try something else?"
        }
    }
    
    return response;
}

export default {
    process_text
}
