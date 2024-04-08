import Actions from '../services/Actions.js'
import logger from '../utils/logger.js'
import {
    ITEM_ID,
    ITEM_NAME,
    CAT_ATTR_TAG_RELATIONS,
    NEW_CATALOG_AVAILABLE,
    TRIGGER_BLIZZARD_MESSAGE,
    CANCEL_BOOKING_MESSAGE,
    TOURISM_STRAPI_URL,
    HOTEL_STRAPI_URL,
    RETAIL_STRAPI_URL,
    ENERGY_STRAPI_URL,
    DOMAINS,
    UPDATE_STATUS_MESSAGE
} from '../utils/constants.js'
import DBService from '../services/DBService.js'
import MapsService from '../services/MapService.js'
import get_text_by_key from '../utils/language.js'

const action = new Actions()

const TWILIO_RECEPIENT_NUMBER = process.env.TEST_RECEPIENT_NUMBER
export const cancelBooking = async (req, res) => {
    try {
        const { orderId } = req.body
        if(!orderId){
            return res.status(400).json({message:"Order Id is Required", status:false})
        }
      
        const validOrderId = await action.call_api(`${TOURISM_STRAPI_URL}/orders/${orderId}`,'GET',{},{ Authorization: `Bearer ${process.env.STRAPI_TOURISM_TOKEN}`})
        logger.info(`OrderDetails: ${JSON.stringify(validOrderId)}`)
        if(!validOrderId.status){
            return res.status(400).send({ message: `Invalid Order Id`, status:false })
        }
        const messageBody = CANCEL_BOOKING_MESSAGE;
        const getOrderAddressDetails = await action.call_api(`${TOURISM_STRAPI_URL}/order-addresses?order_id=${orderId}`,'GET',{},{ Authorization: `Bearer ${process.env.STRAPI_TOURISM_TOKEN}`})
        
        const getOrderFulfillmentDetails = await action.call_api(`${TOURISM_STRAPI_URL}/order-fulfillments?order_id=${orderId}`,'GET',{},{ Authorization: `Bearer ${process.env.STRAPI_TOURISM_TOKEN}`})
        if (getOrderFulfillmentDetails.data.data.length) {
            await action.call_api(`${TOURISM_STRAPI_URL}/order-fulfillments/${getOrderFulfillmentDetails.data.data[0].id}`,'PUT',{
                data: {
                    state_code: 'CANCELLED',
                    state_value: 'CANCELLED BY HOTEL',
                },
            },{ Authorization: `Bearer ${process.env.STRAPI_TOURISM_TOKEN}`})
            let statusMessage = "";
            
            if(getOrderAddressDetails.data.data[0].attributes.phone){
                statusMessage = (await action.send_message(`+91${getOrderAddressDetails.data.data[0].attributes.phone}`, messageBody)).deliveryStatus
            }
            else{
                statusMessage = (await action.send_message(TWILIO_RECEPIENT_NUMBER, messageBody)).deliveryStatus
            }
            return res.status(200).send({ message: `Notification ${statusMessage}`, status:true })
        }
        
        return res.status(200).send({ message: 'Cancel Booking Failed', status:false })
    } catch (error) {
        logger.error(error.message)
        return res.status(400).send({ message: error.message, status:false })
    }
}

export const updateCatalog = async (req, res) => {
    try {
        const { userNo = TWILIO_RECEPIENT_NUMBER } = req.body;
        const messageBody = NEW_CATALOG_AVAILABLE;
        await action.call_api(`${TOURISM_STRAPI_URL}/items/${ITEM_ID}`,'PUT',{
            data: {
                name: ITEM_NAME,
                cat_attr_tag_relations: CAT_ATTR_TAG_RELATIONS,
            },
        },{ Authorization: `Bearer ${process.env.STRAPI_TOURISM_TOKEN}`})
        const notifyResponse = await action.send_message(userNo, messageBody)
        
        if(!notifyResponse || notifyResponse.deliveryStatus === "failed"){
            throw new Error('Notification Failed')
        }
        return res.status(200).send({ message: 'Catalog Updated', status:true })
    } catch (error) {
        logger.error(error.message)
        return res.status(400).send({ message: error.message, status:false })
    }
}


export const notify = async (req, res) => {
    try {
        const { userNo = TWILIO_RECEPIENT_NUMBER } = req.body;
        const messageBody = req.body.message || TRIGGER_BLIZZARD_MESSAGE;
        const sendWhatsappNotificationResponse = await action.send_message(
            userNo,
            messageBody
            )
            if(sendWhatsappNotificationResponse.deliveryStatus === "failed"){
                return res.status(400).json({...sendWhatsappNotificationResponse, status:false})
            }
            sendWhatsappNotificationResponse.deliveryStatus = 'delivered'
            return res.status(200).json({...sendWhatsappNotificationResponse, status:true})
        } catch (error) {
            logger.error(error.message)
            return res.status(400).send({ message: error.message, status:false })
        }
    }
    
    export const triggerExceptionOnLocation = async (req, res) => {
        const {point, message} = req.body; // needs to be an array with 2 numbers [lat, long]
        const db = new DBService();
        const mapService = new MapsService();
        
        if(point && message){
            // get all active sessions
            const sessions = await db.get_all_sessions();
            logger.info(`Got ${sessions.length} sessions.`)
            
            // check if point exists on route
            for(let session of sessions){
                const selected_route = session.data.selected_route;
                if(selected_route?.overview_polyline?.points) {
                    const status = await mapService.checkGpsOnPolygon(point, selected_route?.overview_polyline?.points)

                    logger.info(`Status of gps point ${JSON.stringify(point)} on route ${selected_route.summary} is ${status}`)
                    // send whatsapp and add to context
                    if(status){
                        try{
                            const reply_message = get_text_by_key('incident_on_road', {message: message})
                            await action.send_message(session.key, reply_message);
                            
                            // update session
                            session.data.avoid_point = point;
                            if(!session.data.text) session.data.text=[]
                            session.data.text.push({role: 'assistant', content: reply_message});
    
                            await db.update_session(session.key, session.data);
                        }
                        catch(e){
                            logger.error(e);
                        }
                    }
                }
            }
            res.send("Triggered!")
        }
        else res.status(400).send('Point and message are required in the body.')
    }


export const updateStatus = async (req, res) => {
    try {
        const { orderId, domain="", status=null } = req.body
        if(!orderId){
            return res.status(400).json({message:"Order Id is Required", status:false})
        }
        let DOMAIN_DETAILS = {
            url:"",
            token:"",
            message:""
        }
        switch(domain){
            case DOMAINS.ENERGY:
                DOMAIN_DETAILS = {
                    url:ENERGY_STRAPI_URL,
                    token:process.env.STRAPI_ENERGY_TOKEN,
                    message:status || UPDATE_STATUS_MESSAGE.ENERGY

                }
                break;
            case DOMAINS.RETAIL:
                DOMAIN_DETAILS = {
                    url:RETAIL_STRAPI_URL,
                    token:process.env.STRAPI_RETAIL_TOKEN,
                    message:status || UPDATE_STATUS_MESSAGE.RETAIL
                }
                break;
            case DOMAINS.HOTEL:
                DOMAIN_DETAILS = {
                    url:HOTEL_STRAPI_URL,
                    token:process.env.STRAPI_HOTEL_TOKEN,
                    message:status || UPDATE_STATUS_MESSAGE.HOTEL
                }
                break;
            case DOMAINS.TOURISM:
                DOMAIN_DETAILS = {
                    url:TOURISM_STRAPI_URL,
                    token:process.env.STRAPI_TOURISM_TOKEN,
                    message: status || UPDATE_STATUS_MESSAGE.TOURISM
                }
                break;
        }
        const validOrderId = await action.call_api(`${DOMAIN_DETAILS.url}/orders/${orderId}`,'GET',{},{ Authorization: `Bearer ${DOMAIN_DETAILS.token}`})
        logger.info(`OrderDetails: ${JSON.stringify(validOrderId)}`)
        if(!validOrderId.status){
            return res.status(400).send({ message: `Invalid Order Id`, status:false })
        }
        
        const getOrderFulfillmentDetails = await action.call_api(`${DOMAIN_DETAILS.url}/order-fulfillments?order_id=${orderId}&sort=order_id.id:desc&populate=order_id`,'GET',{},{ Authorization: `Bearer ${DOMAIN_DETAILS.token}`})
        logger.info(`Order Fulfillment Details: ${JSON.stringify(getOrderFulfillmentDetails)}`)
        if (getOrderFulfillmentDetails.data.data.length) {  
            const requiredOrder = getOrderFulfillmentDetails.data.data.find((order)=>order.attributes.order_id.data.id===orderId)
            const updateStatusResponse = await action.call_api(`${DOMAIN_DETAILS.url}/order-fulfillments/${requiredOrder.id}`,'PUT',{
                data: {
                    state_code: DOMAIN_DETAILS.message,
                    state_value: DOMAIN_DETAILS.message,
                },
            },{ Authorization: `Bearer ${DOMAIN_DETAILS.token}`})
            return res.status(200).send({ message: `Status Updated to: ${updateStatusResponse.data.data.attributes.state_value}`, status:true })
        }

        return res.status(400).send({ message: 'Order Status Update Failed', status:false })
    } catch (error) {
        logger.error(error.message)
        return res.status(400).send({ message: error.message, status:false })
    }
}

export const unpublishItem = async (req, res) => {
    try{
        const {domain="", itemId=""} = req.body
        let DOMAIN_DETAILS = {
            url:"",
            token:""
        }

        switch(domain){
            case DOMAINS.ENERGY:
                DOMAIN_DETAILS = {
                    url:ENERGY_STRAPI_URL,
                    token:process.env.STRAPI_ENERGY_TOKEN,

                }
                break;
            case DOMAINS.RETAIL:
                DOMAIN_DETAILS = {
                    url:RETAIL_STRAPI_URL,
                    token:process.env.STRAPI_RETAIL_TOKEN,
                }
                break;
            case DOMAINS.HOTEL:
                DOMAIN_DETAILS = {
                    url:HOTEL_STRAPI_URL,
                    token:process.env.STRAPI_HOTEL_TOKEN,
                }
                break;
            case DOMAINS.TOURISM:
                DOMAIN_DETAILS = {
                    url:TOURISM_STRAPI_URL,
                    token:process.env.STRAPI_TOURISM_TOKEN,
                }
                break;
        }
        const unpublishItemResp = await action.call_api(`${DOMAIN_DETAILS.url}/items/${itemId}`,'PUT',{
            "data":{"publishedAt": null}
          },{ Authorization: `Bearer ${DOMAIN_DETAILS.token}`})
        return res.status(200).json({
            status:unpublishItemResp.status,
            message: unpublishItemResp.error || 'Item Unpublished'
        })
    }catch(error){
        return res.status(400).json({
            status:false,
            message:error.message
        })
    }
}
