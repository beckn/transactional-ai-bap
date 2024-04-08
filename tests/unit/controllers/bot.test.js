import * as chai from 'chai'
import { describe } from 'mocha'
import AI from '../../../services/AI.js'
import MapsService from '../../../services/MapService.js'
import logger from '../../../utils/logger.js'
import ActionService from '../../../services/Actions.js'
const expect = chai.expect
const mapService = new MapsService()
const ai = new AI();
const actionsService = new ActionService()

describe('Should test the Bot controller', () => {
    it.only('It should take a trip plannign input and generate static route image and directions link.', async () => {
        const ask = "Can you plean a trip from Denver to Yellowstone national park?";
        
        // identify source and destination
        const format = {
            'source': 'SOURCE_LOCATION',
            'destination': 'DESTINATION_LOCATION'
        }

        const details = await ai.get_details_by_description(ask, format);
        expect(details).to.have.property('source');
        expect(details).to.have.property('destination');
        
        // Get gps for source and destination
        
        const source_gps = await mapService.lookupGps(details.source);
        const destination_gps = await mapService.lookupGps(details.destination);

        // generate routes
        const routes = await mapService.getRoutes(source_gps, destination_gps);

        // generate image and directions
        const directions = `https://www.google.com/maps/dir/${source_gps.lat},${source_gps.lng}/${destination_gps.lat},${destination_gps.lng}/`;
        const route_image = `https://maps.googleapis.com/maps/api/staticmap?size=300x300&path=enc:${routes[0].overview_polyline.points}&key=${process.env.GOOGLE_MAPS_API_KEY}`;


        await actionsService.send_message(process.env.TEST_RECEPIENT_NUMBER, `Here are the directions: ${directions}`, route_image);
        logger.info(`directions: ${directions}`);
        logger.info(`route_image: ${route_image}`);
        expect(routes).to.be.an('array').that.is.not.empty;        
    })
})

