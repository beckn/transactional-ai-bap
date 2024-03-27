import twilio from 'twilio'
import logger from '../utils/logger.js'
import axios from 'axios'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_NUMBER

const client = twilio(accountSid, authToken)

class Actions {
    
    constructor() {
        this.context = [];
    }
    
    async call_api(endpoint, method, data, headers = {}) {
        logger.info(`Calling ${method} on ${endpoint}...`);
        logger.info(`Data: ${JSON.stringify(data, null, 2)}`);
        let responseObject = {
            status: false,
            retry: false,
        }
        // convert headers to json if it's a string
        if (typeof headers === 'string') headers = JSON.parse(headers)
        const request = { url: endpoint, method, data, headers }
        
        try {
            const response = await axios(request)
            
            responseObject = {
                status: true,
                data: response.data,
                cookies: response.headers['set-cookie'],
            }
            logger.info(`API call was successful: , response.status`)
            logger.info(JSON.stringify(response.data, null, 2))
        } catch (error) {
            logger.error(error)
            
            // Something happened in setting up the request that triggered an Error
            logger.error('Error', error.message)
            responseObject.error = error.message
        }
        return responseObject
    }
    
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
