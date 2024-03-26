import twilio from 'twilio'
import logger from '../utils/logger.js'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_NUMBER

const client = twilio(accountSid, authToken)

class Actions {
    async process_instruction(messageBody) {
        try {
          return `You said "${messageBody}"`
        } catch (error) {
          logger.error(`Error processing instruction: ${error.message}`)
          throw new Error(`Failed to process the instruction: ${error.message}`)
        }
    }

    async send_message(recipient, message) {
        try {
            await client.messages.create({
                body: message,
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${recipient}`,
            })
        } catch (error) {
            logger.error(`Error sending message: ${error.message}`)
            throw new Error(`Failed to send message: ${error.message}`)
        }
    }
}

export default Actions
