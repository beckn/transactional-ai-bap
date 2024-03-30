import * as chai from 'chai'
const expect = chai.expect
import AI from '../../../services/AI.js'
import { readFileSync } from 'fs';
const ai = new AI();
const on_search = JSON.parse(readFileSync('./tests/data/api_responses/on_search.json'))
const on_search_compressed = JSON.parse(readFileSync('./tests/data/api_responses/on_search_compressed.json'))
const on_select = JSON.parse(readFileSync('./tests/data/api_responses/on_select.json'))
const on_init = JSON.parse(readFileSync('./tests/data/api_responses/on_init.json'))
const registry_config = JSON.parse(readFileSync('./config/registry.json'))


describe('Test cases for services/ai/get_beckn_action_from_text()', () => {
    
    it('Should test get_beckn_action_from_text() succesfully for a search intent', async () => {
        const response = await ai.get_beckn_action_from_text("I'm looking for some ev chargers.");
        expect(response.action).to.equal('search');
    })
    
    it('Should test get_beckn_action_from_text() succesfully for a select intent', async () => {
        const context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)}            
        ]
        const response = await ai.get_beckn_action_from_text('I like the first one.', context);
        expect(response.action).to.equal('select');
    })
    
    it('Should test get_beckn_action_from_text() fail for a general query', async () => {
        const response = await ai.get_beckn_action_from_text('What is 2+2?');
        expect(response.action).to.be.null;
    })
    
    it('Should test get_beckn_action_from_text() succesfully for an itinerary', async () => {
        const response = await ai.get_beckn_action_from_text('I want to plan a trip to the mountains. Can you please help me with that?');
        expect(response.action).to.be.null;
    })

    it('Should test get_beckn_action_from_text() succesfulle if called init with the billing details', async () => {
        let context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)},
            {"role": "user", "content": "I want to select the first item"},
            {"role": "assistant", "content": JSON.stringify(on_select)}
        ];
        const response = await ai.get_beckn_action_from_text('Lets place the order. My details are : Mayur Virendra, 9986949245, mayurlibra@gmail.com', context);
        expect(response.action).to.be.eq('init');
    }) 

    it.skip('Should test get_beckn_action_from_text() fail if called init without the billing details', async () => {
        let context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)},
            {"role": "user", "content": "I want to select the first item"},
            {"role": "assistant", "content": JSON.stringify(on_select)}
        ];
        const response = await ai.get_beckn_action_from_text('Lets place the order', context);
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
        
        const context = [
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
    });
});


describe('Test cases for services/ai/get_text_from_json()', () => {
    it('Should test get_text_from_json() and throw response with success false for empty object', async () => {
        const response = await ai.get_text_from_json({})
        expect(response.status).to.equal(false)
    })
    it('Should test get_text_from_json() return some message with success true', async () => {
        const context = [
            {role: 'user', content: 'I want to search for some ev chargers'}
        ]
        const response = await ai.get_text_from_json(on_search, context)
        expect(response.status).to.equal(true)
    })
})

describe('Test cases for _get_config_by_action()', async () => {
    it('Should return right config for search action in ev context', async () => {
        const config = await ai._get_config_by_action('search', "I'm looking for ev:chargers");;
        expect(config).to.have.property('action')
        expect(config.action).to.equal('search');
        expect(config.domain).to.equal('uei:charging');
        expect(config.version).to.equal(registry_config[0].version);
        expect(config.bap_id).to.equal(registry_config[0].bap_subscriber_id);
        expect(config.bap_url).to.equal(registry_config[0].bpp_subscriber_uri);
    })

    it('Should return right config for search action in hospitality contect', async () => {
        const config = await ai._get_config_by_action('search', "I'm looking for some hotels");;
        expect(config).to.have.property('action')
        expect(config.action).to.equal('search');
        expect(config.domain).to.equal('hospitality');
        expect(config.version).to.equal(registry_config[0].version);
        expect(config.bap_id).to.equal(registry_config[0].bap_subscriber_id);
        expect(config.bap_url).to.equal(registry_config[0].bpp_subscriber_uri);
    })

    it('Should return right config for search action in retail contect', async () => {
        const config = await ai._get_config_by_action('search', "I'm looking for some pet food");;
        expect(config).to.have.property('action')
        expect(config.action).to.equal('search');
        expect(config.domain).to.equal('retail:1.1.0');
        expect(config.version).to.equal(registry_config[0].version);
        expect(config.bap_id).to.equal(registry_config[0].bap_subscriber_id);
        expect(config.bap_url).to.equal(registry_config[0].bpp_subscriber_uri);
    })
})