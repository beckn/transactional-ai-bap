import ActionsService from '../services/Actions.js'
import logger from '../utils/logger.js'
import twilio from 'twilio'

const { MessagingResponse } = twilio.twiml
const actionsService = new ActionsService()

async function process_wa_webhook(req, res) {
    try {
        const messageBody = req.body.Body
        const sender = req.body.From
        const twiml = new MessagingResponse()

        logger.info(`Received message from ${sender}: ${messageBody}`)

        const responseMessage =
            await actionsService.process_instruction(messageBody)

        twiml.message(responseMessage)

        res.type('text/xml').send(twiml.toString())
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`)
        res.status(500).send('Failed to process message')
    }
}

export default {
    process_wa_webhook,
}
