import AI from '../services/AI.js';
import DBService from '../services/DBService.js'
import MapService from '../services/MapService.js'
import {
    EMPTY_SESSION
} from '../config/constants.js';
const db = new DBService();
const map = new MapService();

async function getResponse(req, res) {
    const { From, Body } = req.body
    
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

        // get answer from AI 
        const ai = new AI();
        ai.session = session;

        // setup tools
        const available_tools = {
            get_routes: map.getRoutes.bind(map),
            perform_beckn_action: ai.perform_beckn_transaction.bind(ai),
        };
        ai.tools = available_tools;

        // make request
        let messages = [
            ...session.text,
            { role: 'user', content: Body}
        ];
        const response = await ai.getResponseFromOpenAI(messages)

        // save session
        await db.update_session(From, session)

        res.send(response.content)
    }
    
}


export default {
    getResponse
}