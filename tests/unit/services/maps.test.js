import * as chai from 'chai'
const expect = chai.expect
import MapsService from '../../../services/MapService.js'
import { describe } from 'mocha'
const mapService = new MapsService()

describe('Should test the map service', () => {
    it('Should test route fetching', async () => {
        const source ='37.422391,-122.084845';
        const destination = '37.411991,-122.079414';
        
        let routes = await mapService.getRoutes(source, destination);
        
        expect(routes).to.be.an('array');
    });
    
    it('should return GPS coordinates for a valid address', async () => {
        
        const gpsCoordinates = await mapService.lookupGps('1600 Amphitheatre Parkway, Mountain View, CA');
        expect(gpsCoordinates).to.be.an('object');
        expect(gpsCoordinates).to.have.property('lat');
        expect(gpsCoordinates).to.have.property('lng');
    })
    
    
});

