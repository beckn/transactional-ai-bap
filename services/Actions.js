import twilio from 'twilio'
import logger from '../utils/logger.js'
import axios from 'axios'
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
        this.context = [];
    }
    
    async call_api(endpoint, method, data, headers = {}) {
        logger.warn(`Calling ${method} on ${endpoint}...`);
        logger.verbose(`Data: ${JSON.stringify(data, null, 2)}`);
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
                if(response.data.responses.length > 0) {
                    response.data.responses = response.data.responses.slice(0, 1);                
                    if(response?.data?.responses[0].message?.catalog?.providers){
                        response.data.responses[0].message.catalog.providers = response.data.responses[0].message.catalog.providers.slice(0, 3);
                    }
                }
                
            }
            responseObject = {
                status: true,
                data: response.data,
                cookies: response.headers['set-cookie'],
            }
            logger.info(`API call was successful: , response.status`)
            logger.verbose(JSON.stringify(response.data, null, 2))
        } catch (error) {
            logger.error(error)
            
            // Something happened in setting up the request that triggered an Error
            logger.error('Error', error.message)
            responseObject.error = error.message
        }
        return responseObject
    }
    
    async send_message(recipient, message, media_url=null) {
        try {
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
