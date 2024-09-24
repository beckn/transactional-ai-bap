import { describe, it } from 'mocha'
import app from '../../server.js'
import request from 'supertest'
import * as chai from 'chai'
import logger from '../../utils/logger.js'
import DBService from '../../services/DBService.js'
const expect = chai.expect

before(async () => {
    // Reset all sessions
    const db = new DBService()
    await db.clear_all_sessions()
})

describe('API tests for a simple order confirmation workflow', ()=>{
    const chats = [
        {key: "search_hotel", value: "Can you please find hotels near Yellowstone national park?"},
        {key: "select_hotel", value: "Lets select the first one."},
        {key: "initiate_order", value: "Lets initiate the order. My details are : John Doe, 1234567890, john.doe@example.com"},
        {key: "confirm_order", value: "Lets confirm."}
    ]
    
    for(const chat of chats){
        it(`Should return a response for ${chat.key}`, async () => {
            const response = await request(app).post('/webhook').send({
                From: process.env.TEST_RECEPIENT_NUMBER,
                Body: chat.value,
            })
            logger.info(`Response for ${chat.key} : ${response.text}`)
            expect(response.text).to.be.a('string');
            expect(response.text).to.contain('Lake');
        })
    }
})