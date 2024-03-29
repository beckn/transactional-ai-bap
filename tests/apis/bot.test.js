import { describe, it } from 'mocha'
import app from '../../server.js'
import request from 'supertest'
import * as chai from 'chai'
const expect = chai.expect


describe('API tests for /webhook endpoint for an end to end search > select > init > confirm use case', () => {
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
        })

        expect(response.status).equal(200)
        expect(response.text).to.contain('initiated')
    })

    it('Should test successful confirm response using /webhook endpoint', async () => {
        const response = await request(app).post('/webhook').send({
            From: process.env.TEST_RECEPIENT_NUMBER,
            Body: 'Lets confirm!',
        })

        expect(response.status).equal(200)
        expect(response.text).to.contain('confirmed');
    })
})
