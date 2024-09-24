import dotenv from 'dotenv'
import cors from 'cors'
dotenv.config()
import express from 'express'
import bodyParser from 'body-parser'
import logger from './utils/logger.js'
import DBService from './services/DBService.js'
import agentController from './controllers/Agent.js';
import {
    cancelBooking,
    updateCatalog,
    notify,
    triggerExceptionOnLocation,
    updateStatus,
    unpublishItem,
    webhookControl
} from './controllers/ControlCenter.js'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json())

// Define endpoints here
// app.post('/act', actions.act)
app.post('/webhook', agentController.getResponse)
app.post('/notify', notify)
app.post('/cancel-booking', cancelBooking)
app.post('/update-catalog', updateCatalog)
app.post('/trigger-exception', triggerExceptionOnLocation)
app.post('/update-status', updateStatus)
app.post('/unpublish-item', unpublishItem)
app.post('/webhook-ps', webhookControl)

// Reset all sessions
export const db = new DBService()

await db.clear_all_sessions()


// Start the Express server
app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server is running on port ${process.env.SERVER_PORT}`)
})

export default app
