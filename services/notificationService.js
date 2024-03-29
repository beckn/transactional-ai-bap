import logger from '../utils/logger.js'
import Twilio from 'twilio'
const TWILIO_NUMBER = process.env.TWILIO_NUMBER
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID

const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

export const sendWhatsappNotification = async (
    recipientNumber,
    messageBody
) => {
    try {
        const data = await client.messages.create({
            body: messageBody,
            from: `whatsapp:${TWILIO_NUMBER}`,
            to: `whatsapp:${recipientNumber}`,
        })

        const status = await client.messages(data.sid).fetch()
        console.log('data===>', data)
        console.log('status===>', status)
        if(status?.status!=="failed"){
            return {message:'Notification Sent'}
        }return {message:'Failed to Send Notification'}
    } catch (error) {
        logger.error(error.message)
        throw new Error(error.message)
    }
}
