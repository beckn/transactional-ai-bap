import {Client} from "@googlemaps/google-maps-services-js";
import logger from '../utils/logger.js'
import AI from './AI.js'
const ai = new AI();


class MapsService {
    constructor() {
        this.client = new Client({});
    }

    async getRoutes(source, destination) {
        try {
            const response = await this.client.directions({
                params: {
                    origin: source,
                    destination: destination,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                    alternatives: true
                }
            });
            return response.data.routes;
        } catch (error) {
            logger.error(error);
            return [];
        }
    }

    async lookupGps(address) {
        try {
            const response = await this.client.geocode({
                params: {
                    address: address,
                    key: process.env.GOOGLE_MAPS_API_KEY
                }
            });
            if (response.data.results.length > 0) {
                return response.data.results[0].geometry.location;
            } else {
                return null;
            }
        } catch (error) {
            logger.error(error);
            return null;
        }
    }

    get_random_color() {
        const red = Math.floor(Math.random() * 256);   // Generate a random integer between 0 and 255 for red
        const green = Math.floor(Math.random() * 256); // Generate a random integer between 0 and 255 for green
        const blue = Math.floor(Math.random() * 256);  // Generate a random integer between 0 and 255 for blue
    
        // Convert to a hex color code
        const color = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    
        return encodeURIComponent(color);
    }

    async generate_routes(message, context=[]) {
        let response = {
            status:false,
            data: {},
            errors: []
        };

        // identify source and destination
        const format = {
            'source': 'SOURCE_LOCATION',
            'destination': 'DESTINATION_LOCATION'
        }

        const details = await ai.get_details_by_description(message, context, JSON.stringify(format));
        logger.info(JSON.stringify(details, null, 2));
        if(!details.source || !details.destination) {
            if (!details.source ) {
                response.errors.push("Can you please specify the source location?");            
            }
            if (!details.destination) {
                response.errors.push("Can you please specify the destination location?");
            }
        }
        else{
            // Get gps for source and destination                    
            const source_gps = await this.lookupGps(details.source);
            const destination_gps = await this.lookupGps(details.destination);

            if(!source_gps || !destination_gps) {
                if(!source_gps) {
                    response.errors.push("Can you please specify the source location?");
                }
                if(!destination_gps) {
                    response.errors.push("Can you please specify the destination location?");
                }
            }
            else{
                // generate routes
                response.data.routes = await this.getRoutes(source_gps, destination_gps);
                response.data.routes_formatted = {
                    "description": `these are the various routes that you can take. Which one would you like to select:`,
                    "routes": response.data.routes.map((route, index) => `Route ${index+1}: ${route.summary}`)
                }
                response.status = true;
            }            
        }

        logger.info(`Generated routes response : ${JSON.stringify(response, null, 2)}`);
        return response;
    }
}

export default MapsService;
