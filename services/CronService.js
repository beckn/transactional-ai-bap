import {
    DOMAINS,
    BECKN_STATUS_CALL
} from '../utils/constants.js'
import ActionsService from '../services/Actions.js'
import { readFileSync } from 'fs';
import logger from '../utils/logger.js';
const action = new ActionsService()
const registry_config = JSON.parse(readFileSync('./config/registry.json'))
class CronService {
    constructor() {
       
    }
    async sendStatusUpdatedNotification(db){
        try{
        const data = await db.get_data('orderDetails')
        if(data.data.domain){
            
            for(let i=0;i<Object.keys(data.data.domain).length;i++){
                const domainName = Object.keys(data.data.domain)[i];
                switch(domainName){
                    case DOMAINS.ENERGY:
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.energy.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.energy.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.energy.bpp_uri;          
                        break;
                    case DOMAINS.RETAIL:
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.retail.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.retail.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.retail.bpp_uri;      
                        break;
                    case DOMAINS.HOTEL:
                        BECKN_STATUS_CALL.context.domain=registry_config[0].bpps.hospitality.domain;
                        BECKN_STATUS_CALL.context.bpp_id=registry_config[0].bpps.hospitality.bpp_id;
                        BECKN_STATUS_CALL.context.bpp_uri=registry_config[0].bpps.hospitality.bpp_uri;      
                        break;
                    case DOMAINS.TOURISM:
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
            logger.info(`Error Occured: ${error.message}`)
            throw new Error(error.message)
        }
       
    }
}

export default CronService