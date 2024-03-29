import Actions from '../services/Actions.js'
import logger from '../utils/logger.js'
const action = new Actions()
export const notificationController = async (req, res) => {
    try {
        const { recipientNumber, messageBody } = req.body
        const sendWhatsappNotificationResponse = await action.send_message(
            recipientNumber,
            messageBody
        )
        return res.send(sendWhatsappNotificationResponse)
    } catch (error) {
        logger.error(error.message)
        return res.send({ message: error.message })
    }
}
