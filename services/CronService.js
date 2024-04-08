import {
    TOURISM_STRAPI_URL,
    HOTEL_STRAPI_URL,
    RETAIL_STRAPI_URL,
    ENERGY_STRAPI_URL,
    DOMAINS
} from '../utils/constants.js'
import ActionsService from '../services/Actions.js'
const action = new ActionsService()
class CronService {
    constructor() {
       
    }
    async sendStatusUpdatedNotification(db, recipient){
        try{
            const data = await db.get_data('orderDetails')
        if(data.data.domain){
            const statusNotificationPromises = [];
            for(let i=0;i<data.data.domain.length;i++){
                const domainName = Object.keys(data.data.domain[i])[0];
                let DOMAIN_DETAILS = {
                    url:"",
                    token:"",
                    message:""
                }
                switch(domainName){
                    case DOMAINS.ENERGY:
                        DOMAIN_DETAILS = {
                            url:ENERGY_STRAPI_URL,
                            token:process.env.STRAPI_ENERGY_TOKEN
                        }
                        break;
                    case DOMAINS.RETAIL:
                        DOMAIN_DETAILS = {
                            url:RETAIL_STRAPI_URL,
                            token:process.env.STRAPI_RETAIL_TOKEN
                        }
                        break;
                    case DOMAINS.HOTEL:
                        DOMAIN_DETAILS = {
                            url:HOTEL_STRAPI_URL,
                            token:process.env.STRAPI_HOTEL_TOKEN
                        }
                        break;
                    case DOMAINS.TOURISM:
                        DOMAIN_DETAILS = {
                            url:TOURISM_STRAPI_URL,
                            token:process.env.STRAPI_TOURISM_TOKEN
                        }
                        break;
                }
                for(let j=0;j<data.data.domain[i][domainName].orders.length;j++){
                    const order = data.data.domain[i][domainName].orders[j]
                    const getStatus = await action.call_api(`${DOMAIN_DETAILS.url}/order-fulfillments?order_id=${order.orderId}`,'GET',{},{ Authorization: `Bearer ${DOMAIN_DETAILS.token}`})
                    const validOrderFulfillment = getOrderFulfillmentDetails.data.data.filter((strapiOrders)=>strapiOrders.id == order.orderId)
                    console.log("here-->",validOrderFulfillment.length, validOrderFulfillment[0].attributes.state_code !== null, order.orderFulfillmentStatus, validOrderFulfillment[0].attributes.state_code ,validOrderFulfillment[0].attributes.state_code !== order.orderFulfillmentStatus);
                    if(validOrderFulfillment.length && validOrderFulfillment[0].attributes.state_code && validOrderFulfillment[0].attributes.state_code !== order.orderFulfillmentStatus){
                        console.log("here");
                       await action.send_message(
                            process.env.TEST_RECEPIENT_NUMBER,
                            `Hey,\nStatus for order id: ${order.orderId} for Domain: ${domainName} is changed.\nNew Status Is ${validOrderFulfillment[0].attributes.state_code}`
                        )
                    }
                }
            }
            return {}
        }
        }catch(error){
            console.log(error)
            throw new Error(error.message)
        }
       
    }
}

export default CronService