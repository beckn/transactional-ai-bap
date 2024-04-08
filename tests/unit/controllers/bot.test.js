import * as chai from 'chai'
import { describe } from 'mocha'
import AI from '../../../services/AI.js'
import MapsService from '../../../services/MapService.js'
import logger from '../../../utils/logger.js'
import ActionService from '../../../services/Actions.js'
import { readFileSync } from 'fs';
const expect = chai.expect
const mapService = new MapsService()
const ai = new AI();
const actionsService = new ActionService()
const on_search = JSON.parse(readFileSync('./tests/data/api_responses/on_search.json'))
const on_search_compressed = JSON.parse(readFileSync('./tests/data/api_responses/on_search_compressed.json'))
const on_select = JSON.parse(readFileSync('./tests/data/api_responses/on_select.json'))
const on_init = JSON.parse(readFileSync('./tests/data/api_responses/on_init.json'))
const on_confirm = JSON.parse(readFileSync('./tests/data/api_responses/on_confirm.json'))
const registry_config = JSON.parse(readFileSync('./config/registry.json'))

describe('Test cases for AI', () => {
    it('Should return message with location polygon', async () => {

        const source_gps = await mapService.lookupGps('Denver');
        const destination_gps = await mapService.lookupGps('Yellowstone national park');

        // generate routes
        const routes = await mapService.getRoutes(source_gps, destination_gps);

        const context=[
            { role : 'user', content: `Selected route polygon is : ${routes[0].overview_polyline.points}`}
        ]
        let instruction = "I'm looking for some ev chargers along my route. My current location is 30.876877, 73.868969";
        let response = await ai.get_beckn_message_from_text(instruction, context, 'uei:charging')
        logger.info(JSON.stringify(response, null, 2));
        expect(response).to.be.an('object');
        expect(response).to.have.property('intent');
        expect(response.intent).to.have.property('fulfillment');
        expect(response.intent.fulfillment.stops[0].location).to.have.property('polygon');
    })

   
})


describe('Test cases for Google maps', () => {
    it.skip('Should Render a static map image based on source and destination', async ()=>{
        
        const source ='37.422391,-122.084845';
        const destination = '37.411991,-122.079414';
        
        let routes = await mapService.getRoutes(source, destination);
        const selected_route = 0;
        const route_image = `https://maps.googleapis.com/maps/api/staticmap?size=300x300&path=enc:${routes[selected_route].overview_polyline.points}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        logger.info(`route_image: ${route_image}`);
        expect(routes).to.be.an('array');
    })

    it.skip('Should calculate route between an origin and a destination', async ()=>{
        
        const source_gps = await mapService.lookupGps('Denver');
        const destination_gps = await mapService.lookupGps('Yelllowstone national park');

        const directions = `https://www.google.com/maps/dir/${source_gps.lat},${source_gps.lng}/${destination_gps.lat},${destination_gps.lng}/`;
        logger.info(`route_image: ${directions}`);
        expect(source_gps).to.be.an('object');
        expect(source_gps).to.have.property('lat');
        expect(source_gps).to.have.property('lng');
    })

    it('It should take a trip plannign input and generate static route image and directions link.', async () => {
        const ask = "Can you plean a trip from Denver to Yellowstone national park?";
        
        // identify source and destination
        const format = {
            'source': 'SOURCE_LOCATION',
            'destination': 'DESTINATION_LOCATION'
        }

        const details = await ai.get_details_by_description(ask, format);
        expect(details).to.have.property('source');
        expect(details).to.have.property('destination');
        
        logger.info(JSON.stringify(details, null, 2));

        // Get gps for source and destination
        
        const source_gps = await mapService.lookupGps(details.source);
        const destination_gps = await mapService.lookupGps(details.destination);

        // generate routes
        const routes = await mapService.getRoutes(source_gps, destination_gps);

        // Selected route
        const selected_route = 0;

        // generate image and directions
        const directions = `https://www.google.com/maps/dir/${source_gps.lat},${source_gps.lng}/${destination_gps.lat},${destination_gps.lng}/`;
        const route_image = `https://maps.googleapis.com/maps/api/staticmap?size=300x300&path=enc:${routes[selected_route].overview_polyline.points}&key=${process.env.GOOGLE_MAPS_API_KEY}`;


        await actionsService.send_message(process.env.TEST_RECEPIENT_NUMBER, `Here are the directions: ${directions}`); // should also pass the route image, its correctly throwing an error.
        logger.info(`directions: ${directions}`);
        logger.info(`route_image: ${route_image}`);
        expect(routes).to.be.an('array').that.is.not.empty;        
    })

    it('It should be able to take a route as an input and turn it into a text response', async () => {
        const source ='37.422391,-122.084845';
        const destination = '37.411991,-122.079414';
        
        let routes = await mapService.getRoutes(source, destination);
        let summary = 'Here are the available routes for your request: \n\n';
        routes.forEach((route, index) => {
            summary+=`Route ${index+1}: ${route.summary}. \n`;
        })
        logger.info(`Summary of routes: ${summary}`);
        expect(summary).to.be.a('string');
    })
})


