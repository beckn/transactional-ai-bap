import { describe, it} from 'mocha'
import * as chai from 'chai'
const expect = chai.expect
import request from 'supertest'
import app from '../../../server.js'
import logger from '../../../utils/logger.js'

describe('API tests for getResponse() function', () => {
    it('should return 400 if From or Body is missing', async () => {
        const message = "What is the capital of India?"
        const response = await request(app).post('/webhook').send({
            Body: message,
        })
        expect(response.status).to.be.eq(400)
        expect(response.text).to.be.eq('Bad Request');
    })

    it('should return sucecsful response if a general query is asked', async () => {
        const message = "What is the capital of India?"
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: message,
        })
        expect(response.text).to.be.a('string');
        expect(response.text).to.contain('New Delhi');
    })

    it('Should return list of routes between two points if asked', async () => {
        const message = "Can you share routes between New Delhi and Mumbai?"
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: message,
        })
        expect(response.text).to.be.a('string');
        expect(response.text).to.contain('NH 48');
    })

    it('Should return a list of hotels', async () => {
        const message = "Can you please find hotels near Yellowstone national park?"
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: message,
        })
        expect(response.text).to.be.a('string');
        expect(response.text).to.contain('Lake');
    })
})

describe.only('API tests for a order confirmation workflow', ()=>{
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