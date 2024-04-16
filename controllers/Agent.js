import AI from '../services/AI.js';
import DBService from '../services/DBService.js'
import MapService from '../services/MapService.js'
import Actions from '../services/Actions.js';
import {
    EMPTY_SESSION
} from '../config/constants.js';
const db = new DBService();
const actionsService = new Actions();

async function getResponse(req, res) {
    const { From, Body, raw_yn } = req.body
    const format = (req?.headers && req.headers['content-type']) || 'text/xml';

    
    if(!From || !Body){
        res.status(400).send("Bad Request")
    }
    else{
        // get session
        const  session_response = await db.get_session(From);
        let session = session_response.data;
        if(!session_response.status){
            session = EMPTY_SESSION
        }

        // initialize services
        const ai = new AI();
        const map = new MapService();
        ai.session = map.session = session;

        // setup tools
        const available_tools = {
            get_routes: map.getRoutes.bind(map),
            select_route: map.selectRoute.bind(map),
            perform_beckn_action: ai.perform_beckn_transaction.bind(ai),
        };
        ai.tools = available_tools;

        // make request
        let messages = [
            ...session.text,
            { role: 'user', content: Body}
        ];
        const response = await ai.getResponseFromOpenAI(messages, raw_yn)
        
        // prepare raw body if required
        const responseBody = raw_yn ? response.raw : response.content;
        delete response.raw;
        
        messages.push(response);
        session.text = messages; // Update session text (chat history)

        // save session
        await db.update_session(From, session)

        // Send response
        if(format!='application/json'){
            await actionsService.send_message(From, responseBody, []);
            res.send("Message sent!")
        }
        else{
            res.send(responseBody)
        }        
    }    
}


export default {
    getResponse
}