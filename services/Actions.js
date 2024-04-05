import twilio from 'twilio'
import logger from '../utils/logger.js'
import axios from 'axios'
import AI from './AI.js'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_NUMBER

const client = twilio(accountSid, authToken)

class Actions {
    
    constructor() {
        this.ai = new AI()
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
            let response = await axios(request)
            
            // optimise search results. 
            // This code will ensure that for search resylts, only the responses with catalog providers are returned and out of them we only take the first resopnse to further reduce the token size. 
            // This should be imlemented by different baps based on their requirements.
            if(request.data.context && request.data.context.action==='search'){
                response.data.responses = response.data.responses.filter(res => res.message && res.message.catalog && res.message.catalog.providers && res.message.catalog.providers.length > 0)
                if(response.data.responses.length > 0) 
                    response.data.responses = response.data.responses.slice(0, 1);                
            }
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
    
    async send_message(recipient, message) {
        try {
            const data = await client.messages.create({
                body: message,
                from: `whatsapp:${twilioNumber}`,
                to: recipient.includes('whatsapp:') ? recipient : `whatsapp:${recipient}`,
            })
            const status = await client.messages(data.sid).fetch()
            return { deliveryStatus: status.status }
        } catch (error) {
            logger.error(`Error sending message: ${error.message}`)           
            return false;
        }
    }
}

export default Actions
