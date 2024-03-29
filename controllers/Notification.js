import Actions from '../services/Actions.js'
import logger from '../utils/logger.js'
const action = new Actions()
const TWILIO_RECEPIENT_NUMBER = process.env.TOURISM_STRAPI_URL
export const notificationController = async (req, res) => {
    try {
        const { messageBody } = req.body
        const sendWhatsappNotificationResponse = await action.send_message(
            TWILIO_RECEPIENT_NUMBER,
            messageBody
        )
        return res.send(sendWhatsappNotificationResponse)
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}
