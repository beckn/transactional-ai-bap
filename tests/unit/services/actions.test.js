import * as chai from 'chai'
const expect = chai.expect
import ActionService from '../../../services/Actions.js'
import { describe } from 'mocha'

const actionsService = new ActionService()

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

  it('Should test sending a message with media', async () => {
    const recipient = process.env.TEST_RECEPIENT_NUMBER;
    const message = 'This is an image';
    const media_url = 'https://becknprotocol.io/wp-content/uploads/2022/03/logo.png';
    let status = await actionsService.send_message(recipient, message, media_url);
    expect(status.deliveryStatus).to.not.equal('failed')
  });
});

