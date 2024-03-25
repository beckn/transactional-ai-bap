import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import logger from './utils/logger.js'
import messageController from './controllers/Bot.js'
dotenv.config()

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Define endpoints here
// app.post('/act', actions.act)
app.post('/webhook', messageController.process_wa_webhook)

// Start the Express server
app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server is running on port ${process.env.SERVER_PORT}`)
})

export default app
