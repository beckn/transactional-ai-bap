import { describe, it} from 'mocha'
import * as chai from 'chai'
import get_text_by_key from '../../utils/language.js'
const expect = chai.expect

describe('test cases for language utils', ()=>{
    it('Should return valid messge from language key', ()=>{
        const message = get_text_by_key('session_cleared')
        expect(message).to.be.a('string');
    })

    it('Should return valid messge from language key using variable', ()=>{
        let key = 'KEY_TO_MATCH'
        const message = get_text_by_key('route_selected', {url:key})
        expect(message).to.be.a('string');
        expect(message).to.contain(key);
    })
})