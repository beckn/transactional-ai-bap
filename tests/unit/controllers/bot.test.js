import * as chai from 'chai'
import { describe } from 'mocha'
import AI from '../../../services/AI.js'
import MapsService from '../../../services/MapService.js'
const expect = chai.expect
const mapService = new MapsService()
const ai = new AI();

describe('Should test the Bot controller', () => {
    it('Should a trip planning use case', async () => {
        const ask = "Can you plean a trip from Denver to Yellowstone national park?";
        const format = {
            'source': 'SOURCE_LOCATION',
            'destination': 'DESTINATION_LOCATION'
        }

        const details = await ai.get_details_by_description(ask, format);
        expect(details).to.have.property('source');
        expect(details).to.have.property('destination');

        const source_gps = await mapService.lookupGps(details.source);
        const destination_gps = await mapService.lookupGps(details.destination);

        const routes = await mapService.getRoutes(source_gps, destination_gps);
        expect(routes).to.be.an('array').that.is.not.empty;
    })
})

