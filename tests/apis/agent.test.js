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

describe.skip('API tests for /webhook endpoint for an end to end search > select > init > confirm use case', () => {
    it('Should test succesful search response using /webhook endpoint', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "I'm looking for ev chargers near me",
        })

        expect(response.status).equal(200)
        expect(response.text).to.contain('ChargeZone.in')
    })

    it('Should test successful select response using /webhook endpoint', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: 'I would like to select the first one',
        })

        expect(response.status).equal(200)
        expect(response.text).to.contain('ChargeZone.in')
    })

    it('Should test successful init response using /webhook endpoint', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: 'I would like to place an order. My details are : John Doe, 9999999999, test@example.com',
            raw_yn: true
        })

        expect(response.status).equal(200)
        expect(response.body.responses[0].message.order.fulfillments[0]).to.have.property('id')

    })

    it('Should test successful confirm response using /webhook endpoint', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: 'Lets confirm!',
            raw_yn: true
        })

        expect(response.status).equal(200)
        expect(response._body.responses[0].message.order).to.have.property('id')
    })
})


describe('Test cases for trip planning workflow', ()=>{
    it('Should test succesful trip planning intent', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "I'm planing a trip from Denver to Yellowstone national park",
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })

    it('Should return a trip after sharing details.', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "Sure, I'm planning the trip on April 12th, I'm travelling with my family of 4. I also have a shihtzu dog. I have an EV vehicle, want to stay 1 day at the national park. I am a vegan. I want to stay near Casper 1 day to take a break.",
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })
    
    it('Should return search results when asked to look for hotels.', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "Okay, lets find some hotels near Yellowstone National Parkr",
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })

    it('Should select a hotel when asked.', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "Lets select the first one.",
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })

    it('Should init a hotel order when asked.', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "lets initiate the order, My details are : John Doe, 9999999999, test@example.com"
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })

    it('Should init a hotel order when asked.', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "Lets confirm!"
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })

    it('Should try and find another hotel', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: "Lets confirm!"
        })

        expect(response.status).equal(200)
        expect(response.text).to.be.a('string')
    })
})

describe.skip('Test cases for booking collection', ()=>{
    it('Should make the hotel bookings', async ()=>{
        
        const chats = [
            "Hey Alfred, you up? ",
            "I’m hitting Yellowstone National Park on April 12th for 2 days. Find a hotel to book",
            "First one sounds awesome. Lets go with that",
            "Sure, John A. Smith, john.smith@example.com, (555) 123-4567",
            "Sure, lets confirm!",
            "Can you share the best routes from Denver to Yellowstone national park?",
            "Lets go with Route 1",
            "Can you find some ev chargers along the way?",
            "Lets go with the first one",
            "go ahead and initiate!",
            "Sure, lets confirm"
        ];
        

        for(const chat of chats){
            const response = await request(app).post('/webhook').send({
                From: process.env.TEST_RECEPIENT_NUMBER,
                Body: chat,
                raw_yn : 1
            });
            logger.info(JSON.stringify(response.text, null, 2));
            expect(response.status).equal(200);
        } 
    })

    it('Should trigger an exception', async ()=>{
        const response = await request(app).post('/update-status').send({
            "From": process.env.TEST_RECEPIENT_NUMBER,
            "Body": "I'm looking for some ev chargers along my route. Im' currently near Casper."
        })        
        logger.info(JSON.stringify(response.text, null, 2));
        expect(response.status).to.be.eq(200)
    })

    it.skip('Should Place the order for raincoats', async ()=>{
        
        const chats = [
            "Can you find some raincoats near Yellwostone national park?",
            "Lets get the first one",
            "Sure, go ahead and place the order",
            "Lets confirm the order",

        ];

        for(const chat of chats){
            const response = await request(app).post('/webhook').send({
                From: process.env.TEST_RECEPIENT_NUMBER,
                Body: chat,
            });
            logger.info(JSON.stringify(response.text, null, 2));
            expect(response.status).equal(200);
        } 
    })
})

describe('test cases for generating routes', ()=>{
    it('Should share routes when asked to share routes.', async () => {
        const ask = "Can you get routes from Denver to Yellowstone national park?";
        const response = await request(app).post('/webhook').send({
            "From": process.env.TEST_RECEPIENT_NUMBER,
            "Body": ask
        })        
        logger.info(JSON.stringify(response.text, null, 2));
        expect(response.status).to.be.eq(200)

    })

    it('Should come back asking for more details.', async () => {
        const ask = "Can you get routes to Yellowstone national park?";
        const response = await request(app).post('/webhook').send({
            "From": process.env.TEST_RECEPIENT_NUMBER,
            "Body": ask
        })        
        logger.info(response.text);
        expect(response.status).to.be.eq(200)

    })
})

describe('test cases for generating routes and selecting a route', ()=>{
    
    it('Should share routes when asked to share routes.', async () => {
        const ask = "Can you get routes from Denver to Yellowstone national park?";
        const response = await request(app).post('/webhook').send({
            "From": process.env.TEST_RECEPIENT_NUMBER,
            "Body": ask
        })        
        logger.info(JSON.stringify(response.text, null, 2));
        expect(response.status).to.be.eq(200)

    })

    it('should select a route and share directions.', async () => {
        const ask = "Lets select the first route.";
        const response = await request(app).post('/webhook').send({
            "From": process.env.TEST_RECEPIENT_NUMBER,
            "Body": ask
        })        
        logger.info(JSON.stringify(response.text, null, 2));
        expect(response.status).to.be.eq(200)

    })

    it('should search along a route.', async () => {
        const ask = "I'm looking for some ev chargers along my route. Im' currently near Casper.";
        const response = await request(app).post('/webhook').send({
            "From": process.env.TEST_RECEPIENT_NUMBER,
            "Body": ask
        })        
        logger.info(JSON.stringify(response.text, null, 2));
        expect(response.status).to.be.eq(200)

    })

    
})