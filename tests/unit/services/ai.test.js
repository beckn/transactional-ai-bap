import * as chai from 'chai'
const expect = chai.expect
import AI from '../../../services/AI.js'
import Actions from '../../../services/Actions.js'
import logger from '../../../utils/logger.js';
import { readFileSync } from 'fs';
const ai = new AI();
const actions = new Actions();
const on_search = JSON.parse(readFileSync('./tests/data/api_responses/on_search.json'))
const on_search_compressed = JSON.parse(readFileSync('./tests/data/api_responses/on_search_compressed.json'))
const on_select = JSON.parse(readFileSync('./tests/data/api_responses/on_select.json'))
const on_init = JSON.parse(readFileSync('./tests/data/api_responses/on_init.json'))


describe('Test cases for services/ai/get_beckn_action_from_text()', () => {
    
    it('Should test get_beckn_action_from_text() succesfully for a search intent', async () => {
        const response = await ai.get_beckn_action_from_text("I'm looking for some ev chargers.");
        expect(response.action).to.equal('search');
    })
    
    it('Should test get_beckn_action_from_text() succesfully for a select intent', async () => {
        const response = await ai.get_beckn_action_from_text('I want to add this to the cart.');
        expect(response.action).to.equal('select');
    })
    
    it('Should test get_beckn_action_from_text() fail for a general query', async () => {
        const response = await ai.get_beckn_action_from_text('What is 2+2?');
        expect(response.action).to.be.null;
    })
    
    it('Should test get_beckn_action_from_text() succesfully for an itinerary', async () => {
        const response = await ai.get_beckn_action_from_text('I want to plan a trip to the mountains. Can you please help me with that?');
        // logging the resopmse as there is no assertion to be made here.
        logger.info(response.response);
        expect(response.action).to.be.null;
    })

    it('Should test get_beckn_action_from_text() fail if called init without the billing details', async () => {
        const response = await ai.get_beckn_action_from_text('Lets place the order');
        expect(response.action).to.be.null;
    })
})

describe('Test cases for services/ai/compress_search_results()', () => {
    it('Should test succesful compression of search results', async () => {
        const compressed = await ai.compress_search_results(on_search);
        expect(compressed.responses.providers).to.be.an('array')
        expect(compressed.responses.providers.length).to.be.greaterThan(0)
        expect(compressed.responses.providers[0]).to.have.property('id')
        expect(compressed.responses.providers[0]).to.have.property('name')
        expect(compressed.responses.providers[0]).to.have.property('items');
    })
})

describe('Test cases for services/ai/get_beckn_request_from_text()', () => {
    it('Should test get_beckn_request_from_text() succesfully for a `search` intent', async () => {
        const response = await ai.get_beckn_request_from_text("I'm looking for some ev chargers.");
        expect(response.status).to.be.eq(true);
        expect(response.data).to.be.an('object')
        expect(response.data.method.toUpperCase()).to.be.eq('POST')
        expect(response.data.url).to.contain('search')
        expect(response.data.body.message.intent.descriptor).to.have.property('name')
    })    
    it('Should test get_beckn_request_from_text() succesfully for a `select`', async () => {
        
        let context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)}
            
        ]
        const response = await ai.get_beckn_request_from_text("Lets select the first item", context);
        expect(response.data).to.be.an('object')
        expect(response.data.method.toUpperCase()).to.be.eq('POST')
        expect(response.data.url).to.contain('select')
        expect(response.data.body.context).to.have.property('transaction_id')
        expect(response.data.body.context).to.have.property('bpp_id')
        expect(response.data.body.context).to.have.property('bpp_uri')
        expect(response.data.body.message).to.have.property('order')
        expect(response.data.body.message.order).to.have.property('items')
        expect(response.data.body.message.order.items[0]).to.have.property('id')
    })

    it('Should test get_beckn_request_from_text() succesfully for a `init`', async () => {
        let context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)},
            {"role": "user", "content": "I want to select the first item"},
            {"role": "assistant", "content": JSON.stringify(on_select)}
        ]
        const response = await ai.get_beckn_request_from_text("Lets place the order. My details are : Mayur Virendra, 9986949245, mayurlibra@gmail.com", context);
        expect(response.data).to.be.an('object')
        expect(response.data.method.toUpperCase()).to.be.eq('POST')
        expect(response.data.url).to.contain('init')
        expect(response.data.body.context).to.have.property('transaction_id')
        expect(response.data.body.context).to.have.property('bpp_id')
        expect(response.data.body.context).to.have.property('bpp_uri')
        expect(response.data.body.message).to.have.property('order')
        expect(response.data.body.message.order).to.have.property('items')
        expect(response.data.body.message.order.items[0]).to.have.property('id')
        expect(response.data.body.message.order).to.have.property('billing')
        expect(response.data.body.message.order.billing).to.have.property('name')
        expect(response.data.body.message.order.billing).to.have.property('email')
        expect(response.data.body.message.order.billing).to.have.property('phone')
    });

    it('Should test get_beckn_request_from_text() to return with questions if billing details are not provided for  `init`', async () => {
        let context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)},
            {"role": "user", "content": "I want to select the first item"},
            {"role": "assistant", "content": JSON.stringify(on_select)}
        ]
        const response = await ai.get_beckn_request_from_text("Lets place the order.", context);
        expect(response.status).to.be.eq(false);
    });

    it('Should test get_beckn_request_from_text() succesfully for a `confirm`', async () => {
        let context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)},
            {"role": "user", "content": "I want to select the first item"},
            {"role": "assistant", "content": JSON.stringify(on_select)},
            {"role": "user", "content": "Lets place the order. My details are : Mayur Virendra, 9986949245, mayurlibra@gmail.com"},
            {"role": "assistant", "content": JSON.stringify(on_init)}
        ]
        const response = await ai.get_beckn_request_from_text("Lets confirm the order!", context);
        expect(response.data).to.be.an('object')
        expect(response.data.method.toUpperCase()).to.be.eq('POST')
        expect(response.data.url).to.contain('confirm')
        expect(response.data.body.context).to.have.property('transaction_id')
        expect(response.data.body.context).to.have.property('bpp_id')
        expect(response.data.body.context).to.have.property('bpp_uri')
        expect(response.data.body.message).to.have.property('order')
        expect(response.data.body.message.order).to.have.property('items')
        expect(response.data.body.message.order.items[0]).to.have.property('id')
        expect(response.data.body.message.order).to.have.property('billing')
        expect(response.data.body.message.order.billing).to.have.property('name')
        expect(response.data.body.message.order.billing).to.have.property('email')
        expect(response.data.body.message.order.billing).to.have.property('phone')
    });
});