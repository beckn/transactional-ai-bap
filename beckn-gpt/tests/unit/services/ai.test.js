import * as chai from 'chai'
const expect = chai.expect
import AI from '../../../services/AI.js'
const ai = new AI();


describe(`Test cases get_response_or_perform_action()`, ()=> {
    it('Should fail if empty messages sent', async () => {
        const messages  = [];
        const response = await ai.get_response_or_perform_action(messages);
        expect(response).to.be.false;
    })

    it('Should resopnd correctly for a general query', async () => {
        const messages  = [
            {role : 'user', content: "What is the capital of India?"}
        ];
        const response = await ai.get_response_or_perform_action(messages);
        expect(response).to.be.an('object');
        expect(response.content).to.contain('New Delhi');
    })

    // Not adding more test cases as similar test cases are already covered in the controller tests
})

describe(`Test cases perform_beckn_transaction()`, ()=> {
    it('Should test performing a beckn action succesfully', async () => {
        const input  = {
            action: 'search',
            instruction: 'find hotel near Yellowstone National Park on April 12th for 2 days'
        }
        const response = await ai.perform_beckn_transaction(input);
        expect(response).to.be.an('object');
        expect(response.status).to.be.true;
        expect(response.data.length).to.be.gt(0);
    })

    it('Should test performing a beckn action with invalid action', async () => {
        const input  = {
            action: 'bla',
            instruction: 'find hotel near Yellowstone National Park on April 12th for 2 days'
        }
        const response = await ai.perform_beckn_transaction(input);
        expect(response).to.be.an('object');
        expect(response.status).to.be.false;
    })
})

describe(`Test cases for get_context_by_action()`, ()=> {
    it('Should return context for a valid action', async () => {
        const action = 'search';
        const instruction = 'find hotel near Yellowstone National Park on April 12th for 2 days'
        const response = await ai.get_context_by_action(action, instruction);
        expect(response).to.be.an('object');
        expect(response.action).to.be.eq(action);
        expect(response.domain).to.be.eq('hospitality');
    })    
})

describe(`Test cases for get_message_by_action()`, ()=> {
    it('Should return message for a valid action', async () => {
        const action = 'search';
        const instruction = 'find hotel near Yellowstone National Park on April 12th for 2 days'
        const response = await ai.get_message_by_action(action, instruction);
        expect(response).to.be.an('object');
        expect(response).to.have.property('intent');
        
    })
})
