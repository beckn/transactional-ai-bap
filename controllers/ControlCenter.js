import axios from 'axios'
import Actions from '../services/Actions.js'
import logger from '../utils/logger.js'
import {
    ITEM_ID,
    ITEM_NAME,
    CAT_ATTR_TAG_RELATIONS,
    STRAPI_TOURISM_TOKEN,
} from '../utils/constants.js'
const action = new Actions()
const TOURISM_STRAPI_URL = process.env.TOURISM_STRAPI_URL || ''
const TWILIO_RECEPIENT_NUMBER = process.env.TOURISM_STRAPI_URL
export const cancelBookingController = async (req, res) => {
    try {
        const { messageBody, orderId } = req.body
        console.log(orderId)
        const getOrderFulfillmentDetails = await axios.get(
            `${TOURISM_STRAPI_URL}/order-fulfillments?order_id=${orderId}`,
            {
                headers: {
                    Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`,
                },
            }
        )
        if (getOrderFulfillmentDetails.data.data.length) {
            await axios.put(
                `${TOURISM_STRAPI_URL}/order-fulfillments/${getOrderFulfillmentDetails.data.data[0].id}`,
                {
                    data: {
                        state_code: 'CANCELLED',
                        state_value: 'CANCELLED BY HOTEL',
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`,
                    },
                }
            )

            await action.send_message(TWILIO_RECEPIENT_NUMBER, messageBody)
            return res.send({ message: 'Notified' })
        }

        return res.send({ message: 'Cancel Booking Failed' })
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}

export const updateCatalog = async (req, res) => {
    try {
        await axios.put(
            `${TOURISM_STRAPI_URL}/items/${ITEM_ID}`,
            {
                data: {
                    name: ITEM_NAME,
                    cat_attr_tag_relations: CAT_ATTR_TAG_RELATIONS,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${STRAPI_TOURISM_TOKEN}`,
                },
            }
        )
        await action.send_message(TWILIO_RECEPIENT_NUMBER, messageBody)
        return res.send({ message: 'Catalog Updated' })
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}
