import { describe, it } from 'mocha'
import app from '../../server.js'
import request from 'supertest'
import * as chai from 'chai'
import logger from '../../utils/logger.js'
const expect = chai.expect


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
            "Just bought a new EV - Chevrolet Bolt, thinking of taking it out for a spin with the family. ",
            "I'm thinking, Denver to Yellowstone tomorrow for 3 days, traveling with my family of 4 and a pet",
            "Perfect, lets make the bookings!",
            "Lets find the hotel first",
            "Lets select the first one",
            "Adam, 9999999999, adam@example.com",
            "Lets confirm the order"

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

    it('Should make the ticket bookings', async ()=>{
        
        const chats = [
            "lets find tickets for yellowstone national park",
            "4 of the first one please",
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

    it('Should find and book ev chargers', async ()=>{
        
        const chats = [
            "Can you find ev charging stations near me? lat: 48.9762, long: -117.7012",
            "I've selected the first one",
            "Sure, go ahead",
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

    it('Should Place the order for raincoats', async ()=>{
        
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