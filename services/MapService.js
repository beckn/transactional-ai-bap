import {Client} from "@googlemaps/google-maps-services-js";
import logger from '../utils/logger.js'


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
}

export default MapsService;
