import ActionsService from '../services/Actions.js'
import DBService from '../services/DBService.js'
import logger from '../utils/logger.js'
import twilio from 'twilio'

const { MessagingResponse } = twilio.twiml
const actionsService = new ActionsService()
const db = new DBService();

async function process_wa_webhook(req, res) {
    try {
        const message = req.body.Body
        const sender = req.body.From
        const format = req.headers['content-type'] || 'text/xml';
        const raw_yn = req.body.raw_yn || false;
        const twiml = new MessagingResponse();

        const EMPTY_SESSION = {
            sessionId: sender,
            data : []
        }

        logger.info(`Received message from ${sender}: ${message}. Response format: ${format}`)

        // get or create session
        const  session_response = await db.get_session(sender);
        let session = session_response.data;
        if(!session_response.status){
            session = EMPTY_SESSION
        }

        // Process instruction
        const process_response = await actionsService.process_instruction(message, session.data)
        if (process_response.raw?.context?.action === 'search') {
            session = EMPTY_SESSION
        }
        if(process_response.formatted){
            session.data.push({ role: 'user', content: message });  // add user message to session
            if(process_response.raw && typeof process_response.raw === 'object'){
                session.data.push({ role: 'assistant', content: JSON.stringify(process_response.raw) }); // add system response to session
            }
            else{
                session.data.push({ role: 'assistant', content: process_response.formatted }); // add system response to session
            }
            
            await db.update_session(sender, session);
        }        

        // twiml.message(process_response.formatted)
        logger.info(`Sending formatted response to ${sender}: ${process_response.formatted}`)
        if(format!='application/json'){
            // res.type('text/xml').send(twiml.toString())
            actionsService.send_message(sender, process_response.formatted)
            res.send("Done!")
        }
        else{
            raw_yn ? res.send(process_response.raw) : res.send(process_response.formatted)
        }
        
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`)
        res.status(400).send('Failed to process message')
    }
}

export default {
    process_wa_webhook,
}
