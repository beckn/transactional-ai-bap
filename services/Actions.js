import twilio from 'twilio'
import logger from '../utils/logger.js'
import axios from 'axios'
import AI from './AI.js'
import {createWriteStream} from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_NUMBER

const client = twilio(accountSid, authToken)
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, './');

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
    
    async process_instruction(message, context=[]) {
        let response = {
            status: false,
            formatted: 'Failed to process the instruction',
        }
        try {

            // Get action from text message
            this.ai.action = await this.ai.get_beckn_action_from_text(message, context);
            if(this.ai.action?.action === 'search') context = [];

            // Get becnk request from text message
            const beckn_request = await this.ai.get_beckn_request_from_text(message, context);
            if(!beckn_request.status){
                response.formatted = beckn_request.message;              
            }
            else{
                // Call the API
                logger.info(`Making api call...`)
                const call_api_response = await this.call_api(beckn_request.data.url, beckn_request.data.method, beckn_request.data.body, beckn_request.data.headers)
                if(!call_api_response.status){
                    response.formatted = `Failed to call the API: ${call_api_response.error}`
                    response.data = call_api_response.data              
                }
                else{

                    logger.info(`API call successful. Compessing search results in case of search...`)
                    response = {
                        status: true,
                        raw: beckn_request.data.body.context.action==='search' ? await this.ai.compress_search_results(call_api_response.data) : call_api_response.data
                    }

                    // Format the response
                    logger.info(`Formatting response...`);
                    const format_response_response = await this.ai.format_response(
                        call_api_response.data,
                        [...context, { role: 'user', content: message }]
                        )
                        response.formatted = format_response_response.message
                    }                
                }            
            } catch (error) {
                logger.error(`Error processing instruction: ${error.message}`)
                response.formatted = `Failed to process the instruction: ${error.message}`
            }
            
            return response;
        }
        
        async send_message(recipient, message, media_url=null) {
            try {

                logger.info(`Sending message to ${recipient} with media : ${media_url}| Developer mode : ${process.env.DEVELOPER_MODE_ON}`);
                let body = {
                    body: message,
                    from: `whatsapp:${twilioNumber}`,
                    to: recipient.includes('whatsapp:') ? recipient : `whatsapp:${recipient}`,
                }
                
                if(media_url && !parseInt(process.env.DEVELOPER_MODE_ON)){
                    body.mediaUrl = [media_url];
                }
                let data = await client.messages.create(body)
                const status = await client.messages(data.sid).fetch()
                return { deliveryStatus: status.status }
            } catch (error) {
                logger.error(`Error sending message: ${error.message}`)           
                return false;
            }
        }
        
        async download_file(url) {
            const destination_path = path.join(rootPath,'../public');
            try {
                const response = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'stream',
                });
                
                const fileName = `${uuidv4()}.png`;
                const filePath = path.join(destination_path, fileName);
                
                // Create a write stream to save the file
                const writer = createWriteStream(filePath);
                
                // Pipe the response data to the file
                response.data.pipe(writer);
                
                return new Promise((resolve, reject) => {
                    writer.on('finish', ()=>{
                        resolve(`${process.env.SERVER_URL}/public/${fileName}`)
                    });
                    writer.on('error', reject);
                    
                });
            } catch (error) {
                logger.error(`Error sending message: ${error.message}`)           
                return null;
            }
        }
    }
    
    export default Actions
