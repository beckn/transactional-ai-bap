import * as chai from 'chai'
const expect = chai.expect
import AI from '../../../services/AI.js'
import { readFileSync } from 'fs';
const ai = new AI();
const on_search = JSON.parse(readFileSync('./tests/data/api_responses/on_search.json'))
const on_search_compressed = JSON.parse(readFileSync('./tests/data/api_responses/on_search_compressed.json'))
const on_select = JSON.parse(readFileSync('./tests/data/api_responses/on_select.json'))
const on_init = JSON.parse(readFileSync('./tests/data/api_responses/on_init.json'))
const on_confirm = JSON.parse(readFileSync('./tests/data/api_responses/on_confirm.json'))
const registry_config = JSON.parse(readFileSync('./config/registry.json'))
const trip_planning = JSON.parse(readFileSync('./tests/data/chats/trip_planning.json'))


describe('Test cases for services/ai/get_beckn_action_from_text()', () => {
    it('Should return null action when asked a general query', async () => {
        const response = await ai.get_beckn_action_from_text(trip_planning.TRIP_QUERY);
        expect(response).to.have.property('action')
        expect(response.action).to.be.null    
    })

    it('Should return null action when shared details about a trip', async () => {
        const response = await ai.get_beckn_action_from_text(trip_planning.TRIP_DETAILS);
        expect(response).to.have.property('action')
        expect(response.action).to.be.null    
    })

    it('Should return null action when asked about list of bookings to be done', async () => {
        const response = await ai.get_beckn_action_from_text(trip_planning.BOOKINGS_QUERY);
        expect(response).to.have.property('action')
        expect(response.action).to.be.null    
    })

    it('Should return search action when asked about booking a hotel', async () => {
        const response = await ai.get_beckn_action_from_text(trip_planning.FIND_HOTEL);
        expect(response).to.have.property('action')
        expect(response.action).to.equal('search')
    });

    it('Should return select action when user selects an item', async () => {
        const context = [
            {role: 'user', content: trip_planning.FIND_HOTEL},
            {role: 'assistant', content: trip_planning.FIND_HOTEL_RESPONSE}            
        ];
        const response = await ai.get_beckn_action_from_text(trip_planning.SELECT_HOTEL, context);
        expect(response).to.have.property('action')
        expect(response.action).to.equal('select')
    });

    it('Should return init action when user tried to place an order', async () => {
        const context = [
            {role: 'user', content: trip_planning.FIND_HOTEL},
            {role: 'assistant', content: trip_planning.FIND_HOTEL_RESPONSE},
            {role: 'user', content: trip_planning.SELECT_HOTEL},
            {role: 'assistant', content: trip_planning.SELECT_HOTEL_RESPONSE}
        ];
        
        const response = await ai.get_beckn_action_from_text(trip_planning.INIT_HOTEL, context);
        expect(response).to.have.property('action')
        expect(response.action).to.equal('init')
    });

    it('Should return confirm action when user tried to confirm an order', async () => {
        const context = [
            {role: 'user', content: trip_planning.FIND_HOTEL},
            {role: 'assistant', content: trip_planning.FIND_HOTEL_RESPONSE},
            {role: 'user', content: trip_planning.SELECT_HOTEL},
            {role: 'assistant', content: trip_planning.SELECT_HOTEL_RESPONSE}
        ];
        
        const response = await ai.get_beckn_action_from_text(trip_planning.CONFIRM_HOTEL, context);
        expect(response).to.have.property('action')
        expect(response.action).to.equal('confirm')
    });

    it('Should return null action when user used the word `confirm` for someothing else', async () => {
        const response = await ai.get_beckn_action_from_text('Can you confirm whats the latest time?');
        expect(response).to.have.property('action')
        expect(response.action).to.be.null
    });
})

describe('Test cases for get_ai_response_to_query() function', () => {
    it('Should return a response with success false for an empty query', async () => {
        const response = await ai.get_ai_response_to_query('Hi');
        expect(response).to.be.an.string;
    })

    it('Should return a response with success true for a valid query', async () => {
        const response = await ai.get_ai_response_to_query('I want to plan atrip from Denver to yellowstone');
        expect(response).to.be.an.string;
    })
})

describe('Test cases for get_schema_by_action() function', () => {
    it('Should return a search schema for search', async () => {
        ai.action = {action: 'search'};
        const response = await ai.get_schema_by_action(`I'm looking for some hotels`);
        expect(response.paths).to.have.property('/search')
    })

    it('Should return false if no action found', async () => {
        const response = await ai.get_schema_by_action(`I'm looking for some hotels`);
        expect(response).to.be.false;
    })

    it('Should return false if inavlid action found', async () => {
        ai.action = {action: 'invalid'};
        const response = await ai.get_schema_by_action(`I'm looking for some hotels`);
        expect(response).to.be.false;
    })
})

describe('Test cases for get_context_by_instruction()', async () => {
    it('Should return right config for search action in ev context', async () => {
        ai.action = {action: 'search'};
        const config = await ai.get_context_by_instruction("I'm looking for ev:chargers");;
        expect(config).to.have.property('action')
        expect(config.action).to.equal('search');
        expect(config.domain).to.equal('uei:charging');
        expect(config.version).to.equal(registry_config[0].version);
        expect(config.bap_id).to.equal(registry_config[0].bap_subscriber_id);
        expect(config.bap_url).to.equal(registry_config[0].bpp_subscriber_uri);
    })

    it('Should return right config for search action in hospitality contect', async () => {
        ai.action = {action: 'search'};
        const config = await ai.get_context_by_instruction("Okay, lets find some hotels near Yellowstone National Park");
        expect(config).to.have.property('action')
        expect(config.action).to.equal('search');
        expect(config.domain).to.equal('hospitality');
        expect(config.version).to.equal(registry_config[0].version);
        expect(config.bap_id).to.equal(registry_config[0].bap_subscriber_id);
        expect(config.bap_url).to.equal(registry_config[0].bpp_subscriber_uri);
    })

    it('Should return right config for search action in retail contect', async () => {
        ai.action = {action: 'search'};
        const config = await ai.get_context_by_instruction("I'm looking for some pet food");;
        expect(config).to.have.property('action')
        expect(config.action).to.equal('search');
        expect(config.domain).to.equal('retail:1.1.0');
        expect(config.version).to.equal(registry_config[0].version);
        expect(config.bap_id).to.equal(registry_config[0].bap_subscriber_id);
        expect(config.bap_url).to.equal(registry_config[0].bpp_subscriber_uri);
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

        ai.action = {action: 'search'};
        const schema = await ai.get_schema_by_action();
        const response = await ai.get_beckn_request_from_text("I'm looking for some ev chargers.", [], on_search.context, schema);
        expect(response.status).to.be.eq(true);
        expect(response.data).to.be.an('object')
        expect(response.data.method.toUpperCase()).to.be.eq('POST')
        expect(response.data.url).to.contain('search')
        expect(response.data.body.message.intent.descriptor).to.have.property('name')
    })

    it('Should test get_beckn_request_from_text() succesfully for a `select`', async () => {
        
        ai.action = {action: 'select'};
        const schema = await ai.get_schema_by_action();
        
        const context = [
            {"role": "user", "content": "I'm looking for some ev chargers"},
            {"role": "assistant", "content": JSON.stringify(on_search_compressed)}            
        ]
        const response = await ai.get_beckn_request_from_text("Lets select the first item", context, on_select.context, schema);
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
        ai.action = {action: 'init'};
        const schema = await ai.get_schema_by_action();        

        const response = await ai.get_beckn_request_from_text("Lets place the order. My details are : John Doe, john.doe@example.com, 9999999999", context, on_init.context, schema);
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
            {"role": "user", "content": "Lets place the order. My details are : John Doe, john.doe@example.com, 9999999999"},
            {"role": "assistant", "content": JSON.stringify(on_init)}
        ]

        ai.action = {action: 'confirm'};
        const schema = await ai.get_schema_by_action();
        
        const response = await ai.get_beckn_request_from_text("Lets confirm the order!", context, on_confirm.context, schema);
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

