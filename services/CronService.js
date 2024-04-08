import {
    TOURISM_STRAPI_URL,
    HOTEL_STRAPI_URL,
    RETAIL_STRAPI_URL,
    ENERGY_STRAPI_URL,
    DOMAINS,
    BECKN_STATUS_CALL
} from '../utils/constants.js'
import ActionsService from '../services/Actions.js'
import { readFileSync } from 'fs';
const action = new ActionsService()
const registry_config = JSON.parse(readFileSync('./config/registry.json'))
class CronService {
    constructor() {
       
    }
    async sendStatusUpdatedNotification(db, recipient){
        try{
        const data = await db.get_data('orderDetails')
        console.log('Data before getStatus--->',JSON.stringify(data))
        if(data.data.domain){
            
            for(let i=0;i<Object.keys(data.data.domain).length;i++){
                const domainName = Object.keys(data.data.domain)[i];
                let DOMAIN_DETAILS = {
                    url:"",
                    token:"",
                }
                switch(domainName){
                    case DOMAINS.ENERGY:
                        DOMAIN_DETAILS = {
                            url:ENERGY_STRAPI_URL,
                            token:process.env.STRAPI_ENERGY_TOKEN
                        }
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.energy.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.energy.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.energy.bpp_uri;          
                        break;
                    case DOMAINS.RETAIL:
                        DOMAIN_DETAILS = {
                            url:RETAIL_STRAPI_URL,
                            token:process.env.STRAPI_RETAIL_TOKEN
                        }
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.retail.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.retail.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.retail.bpp_uri;      
                        break;
                    case DOMAINS.HOTEL:
                        DOMAIN_DETAILS = {
                            url:HOTEL_STRAPI_URL,
                            token:process.env.STRAPI_HOTEL_TOKEN
                        }
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.hospitality.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.hospitality.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.hospitality.bpp_uri;      
                        break;
                    case DOMAINS.TOURISM:
                        DOMAIN_DETAILS = {
                            url:TOURISM_STRAPI_URL,
                            token:process.env.STRAPI_TOURISM_TOKEN
                        }
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.tourism.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.tourism.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.tourism.bpp_uri;      
                        break;
                }
              
                BECKN_STATUS_CALL.context.bap_id=registry_config[0].bap_subscriber_id;
                BECKN_STATUS_CALL.context.bap_uri=registry_config[0].bap_subscriber_url;
                for(let j=0;j<Object.keys(data.data.domain[domainName]['orders']).length;j++){
                    const orderId = Object.keys(data.data.domain[domainName]['orders'])[j];
                  
                    BECKN_STATUS_CALL.message.order_id = `${orderId}`
                    const getStatus = await action.call_api(`${registry_config[0].url}/status`,'POST',BECKN_STATUS_CALL)
                    const fulfillmentStatusCode = getStatus.data.responses.length ? getStatus.data.responses[0].message.order.fulfillments[0].state.descriptor.code :""

                    if(data.data.domain[domainName].orders[orderId].orderFulfillmentStatus !== fulfillmentStatusCode){
                        data.data.domain[domainName].orders[orderId].orderFulfillmentStatus = fulfillmentStatusCode;
                        await action.send_message(
                            process.env.TEST_RECEPIENT_NUMBER,
                            `Hey there,\nJust wanted to give you a quick update! The status of your order with ID ${orderId} under the domain "${domainName}" has been updated.\nThe new status is: "${fulfillmentStatusCode}".\n\nIf you have any questions or need further assistance, feel free to reach out. We're here to help!`
                        )
                    }
                   
                }
            }
          
            await db.set_data('orderDetails', data.data)
            
            return {status:true, message:"Notification Sent"}
        }
        }catch(error){
            console.log(error)
            throw new Error(error.message)
        }
       
    }
}

export default CronService