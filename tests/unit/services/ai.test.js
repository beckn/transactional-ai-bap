import * as chai from 'chai'
const expect = chai.expect
import AI from '../../../services/AI.js'
import logger from '../../../utils/logger.js';
const ai = new AI();

describe('Test cases for services/ai.js', () => {
    
    it('Should test get_beckn_action_from_text() succesfully for a search intent', async () => {
        const response = await ai.get_beckn_action_from_text("I'm looking for some shoes.");
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
})