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
        const twiml = new MessagingResponse();

        // get or create session
        const  session_response = await db.get_session(sender);
        let session = session_response.data;
        if(!session_response.status){
            session = {
                sessionId: sender,
                data : []
            }
        }


        logger.info(`Received message from ${sender}: ${message}`)
        
        const process_response = await actionsService.process_instruction(message, session.data)
        
        if(process_response.status && process_response.message){
            session.data.push({ role: 'user', content: message });  // add user message to session
            session.data.push({ role: 'assistant', content: process_response.message }); // add system response to session
            await db.update_session(sender, session);
        }        

        twiml.message(process_response.message)

        res.type('text/xml').send(twiml.toString())
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`)
        res.status(400).send('Failed to process message')
    }
}

export default {
    process_wa_webhook,
}
