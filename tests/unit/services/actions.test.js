import * as chai from 'chai'
const expect = chai.expect
import ActionService from '../../../services/Actions.js'
import { describe } from 'mocha'
const actionsService = new ActionService()

describe.skip('Test cases for process_instruction function', ()=> {
  it('should process the instruction message', async () => {
    const messageBody = 'Hi. What is 2+2?';
    const result = await actionsService.process_instruction(messageBody);
    expect(result.formatted).to.contain('4');
  });
  
  it('should process the instruction message', async () => {
    const messageBody = 'What is the captial of India?';
    const result = await actionsService.process_instruction(messageBody);
    expect(result.formatted).to.contain('New Delhi');
  });
  
  it('Should test process_instruction() for a search intent', async () => {
    const message = "I'm looking for some ev chargers.";
    const response = await actionsService.process_instruction(message);
    expect(response.formatted).to.be.a('string');
  })
  
  it('Should test succesfull process instruction with response status:false', async () => {
    const messageBody = "What is capital of India";
    const data = await actionsService.process_instruction(messageBody);
    expect(data.status).to.equal(false)
  })
  
  it('Should test succesfull process instruction for Searching a ev charging station', async () => {
    const messageBody = "I want to search ev charging";
    const data = await actionsService.process_instruction(messageBody);
    expect(data.formatted).to.be.a('string')
  })
  
  
  it('Should test succesfull process instruction for throwing an error', async () => {
    const messageBody = "";
    try{
      await actionsService.process_instruction(messageBody);
    }catch(error){
      expect(error).to.be.an.instanceOf(Error)
    }
  })
})

describe('should test send_message()', () => {
  it('should test send a message via Twilio', async () => {
    const recipient = process.env.TEST_RECEPIENT_NUMBER;
    const message = "hi, this is a test message";
    
    let status = await actionsService.send_message(recipient, message);
  
    expect(status.deliveryStatus).to.not.equal('failed')
  });

  it('should test send a message via Twilio with a whatsapp prefix', async () => {
    const recipient = `whatsapp:${process.env.TEST_RECEPIENT_NUMBER}`;
    const message = "hi, this is a test message";
    
    let status = await actionsService.send_message(recipient, message);
    expect(status.deliveryStatus).to.not.equal('failed')

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

