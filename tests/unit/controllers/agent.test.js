import { describe, it} from 'mocha'
import * as chai from 'chai'
import agent from '../../../controllers/Agent.js';
const expect = chai.expect

describe.only('API tests for getResponseFromOpenAI() function', () => {
    it('Should return a string message for a common question', async ()=>{
        let messages = [
            { role: 'user', content: "What is the capital of India?" },
        ];
        
        const response = await agent.getResponseFromOpenAI(messages);
        expect(response.content).to.be.a('string');
        expect(response.content).to.contain('New Delhi');
    })

    it('Should return routes when asked for routes', async ()=>{
        let messages = [
            { role: 'user', content: "Can you get me routes from Delhi to Mumbai?"},
        ];
        const response = await agent.getResponseFromOpenAI(messages);
        expect(response.content).to.be.a('string');
        expect(response.content).to.contain('NH 48');
    })

    it('Should be able to search for items on network', async ()=>{
        let messages = [
            { role: 'user', content: "Can you find some ev chargers near Denver?"},
        ];
        const response = await agent.getResponseFromOpenAI(messages);
        expect(response.content).to.be.a('string');
    })
})