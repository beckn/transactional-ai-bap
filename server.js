import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import bodyParser from 'body-parser'
import logger from './utils/logger.js'
import messageController from './controllers/Bot.js'
import DBService from './services/DBService.js'

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Define endpoints here
// app.post('/act', actions.act)
app.post('/webhook', messageController.process_wa_webhook)

// Reset all sessions
const db = new DBService();
await db.clear_all_sessions();

// Start the Express server
app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server is running on port ${process.env.SERVER_PORT}`)
})

export default app
