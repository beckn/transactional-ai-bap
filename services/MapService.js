import {Client} from "@googlemaps/google-maps-services-js";
import logger from '../utils/logger.js'
import polyline from '@mapbox/polyline';

class MapsService {
    constructor() {
        this.client = new Client({});
        this.session = {};
        this.routes_image = null;
    }

    /**
     * 
     * @param {*} source | format : [latitude, longitude], "latitude,longitude"
     * @param {*} destination | format : "latitude,longitude"
     * @param {*} avoidPoint | format : [[latitude, longitude], [latitude, longitude], ...]
     * @returns 
     */
    async getRoutes({source, destination, avoidPoint=[]}) {
        try {
            const response = await this.client.directions({
                params: {
                    origin: source,
                    destination: destination,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                    alternatives: true
                }
            });
            let routes= [];
            for(const route of response.data.routes){
                // update navigation link
                route.navigation_url = `https://www.google.com/maps/dir/${source}/${destination}/`;

                // check avoid point
                const status = await this.checkGpsOnPolygon(avoidPoint, route.overview_polyline.points)
                if(!status) routes.push(route)
            }
            
            
            const path = this.get_static_image_path(routes);
            logger.info(`Static image path for routes: ${path}`);
            
            // Save session if possible
            if(this.session){
                this.session.routes = routes;
                this.routes_image = path;
            }

            return routes.map(route => route.summary);
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

    async selectRoute(index) {
        logger.info(`Selecting route ${index.index}`);
        if (this.session.routes && index.index >= 0 && index.index < this.session.routes.length) {
            this.session.profile.selected_route = {
                polyline: this.session.routes[index.index].overview_polyline.points
            }
            return true;
        } else {
            return false;
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

    /**
     * Check if a GPS point is on a polyline
     * 
     * @param {Array<Number>} point - The GPS point to check, in [latitude, longitude] format.
     * @param {String} encodedPolyline - The encoded overview polyline from Google Maps Directions API.
     * @param {Number} tolerance - The maximum distance (in meters) for a point to be considered on the polyline.
     * @returns {Boolean} true if the point is on the polyline within the specified tolerance, false otherwise.
     */
    async checkGpsOnPolygon(point, encodedPolyline, tolerance = 500){
        // Decode the polyline to get the array of points
        const polylinePoints = polyline.decode(encodedPolyline);

        // Check each segment of the polyline
        for (let i = 0; i < polylinePoints.length - 1; i++) {
            const start = polylinePoints[i];
            const end = polylinePoints[i + 1];

            if (this.isPointNearLineSegment(point, start, end, tolerance)) {
                return true;
            }
        }

        return false;
    }

    isPointNearLineSegment(point, start, end, tolerance) {
        // Convert degrees to radians
        const degToRad = deg => (deg * Math.PI) / 180;
    
        // Earth radius in meters
        const R = 6371000;
    
        // Point latitude and longitude in radians
        const pointLatRad = degToRad(point[0]);
        const pointLonRad = degToRad(point[1]);
    
        // Start point latitude and longitude in radians
        const startLatRad = degToRad(start[0]);
        const startLonRad = degToRad(start[1]);
    
        // End point latitude and longitude in radians
        const endLatRad = degToRad(end[0]);
        const endLonRad = degToRad(end[1]);
    
        // Using the 'cross-track distance' formula
        const delta13 = Math.acos(Math.sin(startLatRad) * Math.sin(pointLatRad) +
            Math.cos(startLatRad) * Math.cos(pointLatRad) * Math.cos(pointLonRad - startLonRad)) * R;
        const theta13 = Math.atan2(Math.sin(pointLonRad - startLonRad) * Math.cos(pointLatRad),
            Math.cos(startLatRad) * Math.sin(pointLatRad) - Math.sin(startLatRad) * Math.cos(pointLatRad) * Math.cos(pointLonRad - startLonRad));
        const theta12 = Math.atan2(Math.sin(endLonRad - startLonRad) * Math.cos(endLatRad),
            Math.cos(startLatRad) * Math.sin(endLatRad) - Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLonRad - startLonRad));
    
        const deltaXt = Math.asin(Math.sin(delta13 / R) * Math.sin(theta13 - theta12)) * R;
    
        return Math.abs(deltaXt) < tolerance;
    }

    get_static_image_path(routes){
        let polygon_path = '';
        routes.forEach((route, index) => {
            polygon_path+=`&path=color:${this.get_random_color()}|weight:${5-index}|enc:${route.overview_polyline.points}`;
        })
        
        const route_image = `https://maps.googleapis.com/maps/api/staticmap?size=300x300${polygon_path}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        return route_image;
                
    }
}

export default MapsService;
