import dotenv from 'dotenv';
dotenv.config();
import bodyParser from 'body-parser'
import express from 'express'
import logger from './utils/logger.js'
const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Define endpoints here
// app.post('/act', actions.act)

// Start the Express server
app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server is running on port ${process.env.SERVER_PORT}`)
})

export default app
