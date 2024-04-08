import {Client} from "@googlemaps/google-maps-services-js";


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
                    key: process.env.GOOGLE_MAPS_API_KEY
                }
            });
            return response.data.routes;
        } catch (error) {
            console.error(error);
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
            console.error(error);
            return null;
        }
    }
}

export default MapsService;
