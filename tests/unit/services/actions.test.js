import * as chai from 'chai'
const expect = chai.expect
import ActionService from '../../../services/Actions.js'
import { describe } from 'mocha'
const actionsService = new ActionService()

describe('Test cases for services/actions.js', () => {
  describe('should test process_instruction()', ()=> {
    it('should process the instruction message', async () => {
      const messageBody = 'test message';
      const result = await actionsService.process_instruction(messageBody);
      expect(result.message).to.equal('You said "test message"');
    });
  })
  
  describe('should test send_message()', () => {
    it('should test send a message via Twilio', async () => {
      const recipient = process.env.TEST_RECEPIENT_NUMBER;
      const message = "hi, this is a test message";
      
      try {
        await actionsService.send_message(recipient, message);
        
      } catch (error) {
        throw new Error('Message sending failed');
      }
    });
    
    it('should throw an error for invalid recipient', async () => {
      const recipient = '';
      const message = 'Test message';
      
      try {
        await actionsService.send_message(recipient, message);
        throw new Error('Expected an error to be thrown');
      } catch (error) {
        
        expect(error).to.be.an.instanceOf(Error);
      }
    });
    
    it('should throw an error for empty message', async () => {
      const recipient = process.env.TEST_RECEPIENT_NUMBER;
      const message = '';
      
      try {
        await actionsService.send_message(recipient, message);
        throw new Error('Expected an error to be thrown');
      } catch (error) {
        
        expect(error).to.be.an.instanceOf(Error);
      }
    });
  });

  describe('Test cases for api calling', () => {
    it('Should test succesfull api call', async () => {
      let url = 'https://jsonplaceholder.typicode.com/posts/1';
      let method = 'GET';
      let data = {};
      let headers = {};
      const response = await actionsService.call_api(url, method, data, headers);
      expect(response.status).to.be.true;
      expect(response.data).to.be.an('object');

    })

    it('Should test unsuccesfull api call', async () => {
      let url = '/posts/1';
      let method = 'GET';
      let data = {};
      let headers = {};
      const response = await actionsService.call_api(url, method, data, headers);
      expect(response.status).to.be.false;
    })
  })

  describe.only('Test cases for Process Instruction action', () => {
    
    it('Should test succesfull process instruction for general statement', async () => {
     const messageBody = "What is capital of India";
     const data = await actionsService.process_instruction(messageBody);
     expect(data.message).to.contain('New Delhi')
    })

    it('Should test succesfull process instruction with response status:false', async () => {
      const messageBody = "What is capital of India";
      const data = await actionsService.process_instruction(messageBody);
      console.log(data)
      expect(data.status).to.equal(false)
     })

    it('Should test succesfull process instruction for Searching a ev charging station', async () => {
      const messageBody = "I want to search ev charging";
      const data = await actionsService.process_instruction(messageBody);
      console.log(data)
      expect(data.message).to.contain('ChargeZone.in')
     })


     it('Should test succesfull process instruction for throwing an error', async () => {
      const messageBody = "";
      try{
        const data = await actionsService.process_instruction(messageBody);
      }catch(error){
        expect(error).to.be.an.instanceOf(Error)
      }
     })
  })
})