import Actions from '../services/Actions.js'
import { readFileSync } from 'fs';
import logger from '../utils/logger.js'
import {
    ITEM_ID,
    ITEM_NAME,
    CAT_ATTR_TAG_RELATIONS,
    NEW_CATALOG_AVAILABLE,
    TRIGGER_BLIZZARD_MESSAGE,
    CANCEL_BOOKING_MESSAGE
} from '../utils/constants.js'
const config = JSON.parse(readFileSync('./config/openai.json'))

const action = new Actions()
const STRAPI_TOURISM_TOKEN = process.env.STRAPI_TOURISM_TOKEN || ''
const TWILIO_RECEPIENT_NUMBER = process.env.TEST_RECEPIENT_NUMBER
export const cancelBooking = async (req, res) => {
    try {
        const { orderId } = req.body
        if(!orderId){
            return res.status(500).json({message:"Order Id is Required", status:false})
        }
        const validOrderId = await action.call_api(`${config.PRESETS.TOURISM_STRAPI_URL}/orders/${orderId}`,'GET',{},{ Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`})
        if(!validOrderId.status){
            return res.send({ message: `Invalid Order Id`, status:false })
        }
        const messageBody = CANCEL_BOOKING_MESSAGE;
        const getOrderAddressDetails = await action.call_api(`${config.PRESETS.TOURISM_STRAPI_URL}/order-addresses?order_id=${orderId}`,'GET',{},{ Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`})
        
        const getOrderFulfillmentDetails = await action.call_api(`${config.PRESETS.TOURISM_STRAPI_URL}/order-fulfillments?order_id=${orderId}`,'GET',{},{ Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`})
        if (getOrderFulfillmentDetails.data.data.length) {
            await action.call_api(`${config.PRESETS.TOURISM_STRAPI_URL}/order-fulfillments/${getOrderFulfillmentDetails.data.data[0].id}`,'PUT',{
                data: {
                    state_code: 'CANCELLED',
                    state_value: 'CANCELLED BY HOTEL',
                },
            },{ Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`})
            let statusMessage = "";
            
            if(getOrderAddressDetails.data.data[0].attributes.phone){
                statusMessage = (await action.send_message(`+91${getOrderAddressDetails.data.data[0].attributes.phone}`, messageBody)).status.status
            }
            else{
                statusMessage = (await action.send_message(TWILIO_RECEPIENT_NUMBER, messageBody)).status.status
            }
            return res.send({ message: `Notification ${statusMessage}` })
        }

        return res.send({ message: 'Cancel Booking Failed' })
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}

export const updateCatalog = async (req, res) => {
    try {
        const { userNo = TWILIO_RECEPIENT_NUMBER } = req.body;
        const messageBody = NEW_CATALOG_AVAILABLE;
        await action.call_api(`${config.PRESETS.TOURISM_STRAPI_URL}/items/${ITEM_ID}`,'PUT',{
            data: {
                name: ITEM_NAME,
                cat_attr_tag_relations: CAT_ATTR_TAG_RELATIONS,
            },
        },{ Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`})
        const notifyResponse = await action.send_message(userNo, messageBody)
        if(notifyResponse.status.status === "failed"){
            throw new Error('Notification Failed')
        }
        return res.send({ message: 'Catalog Updated' })
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}


export const notify = async (req, res) => {
    try {
        const { userNo = TWILIO_RECEPIENT_NUMBER } = req.body;
        const messageBody = TRIGGER_BLIZZARD_MESSAGE;
        const sendWhatsappNotificationResponse = await action.send_message(
            userNo,
            messageBody
        )
        return res.send(sendWhatsappNotificationResponse)
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}