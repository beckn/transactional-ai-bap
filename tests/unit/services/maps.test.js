import * as chai from 'chai'
const expect = chai.expect
import MapsService from '../../../services/MapService.js'
import { describe } from 'mocha'
const mapService = new MapsService()

describe('Should test the map service', () => {
    it('Should test route fetching', async () => {
        const source ='37.422391,-122.084845';
        const destination = '37.411991,-122.079414';
        
        let routes = await mapService.getRoutes({source: source, destination: destination});
        
        expect(routes).to.be.an('array');
    });

    it('Should test route fetching with strings', async () => {
        const source ='Bengaluru';
        const destination = 'Mumbai';
        
        let routes = await mapService.getRoutes({source: source, destination: destination});
        
        expect(routes).to.be.an('array');
    });
    
    it('should return GPS coordinates for a valid address', async () => {
        
        const gpsCoordinates = await mapService.lookupGps('Yellowstone national park');
        expect(gpsCoordinates).to.be.an('object');
        expect(gpsCoordinates).to.have.property('lat');
        expect(gpsCoordinates).to.have.property('lng');
    })

    it('Sould return true if a given gps location falls on a selected polygon', async()=>{

        const source ='37.422391,-122.084845';
        const destination = '37.411991,-122.079414';
        
        const point = [37.422391, -122.084845];
        let routes = await mapService.getRoutes({source: source, destination: destination});

        const status = await mapService.checkGpsOnPolygon(point, routes[0].overview_polyline.points);
        expect(status).to.be.true;
    })
    
    it('Should return path avoiding certail points', async ()=>{
        const source ='39.7392358,-104.990251';
        const destination = '44.427963, -110.588455';
        const pointBeforeCasper = [42.839531, -106.136404];
        await mapService.getRoutes({source: source, destination: destination, avoidPoint: [pointBeforeCasper]});
    })
    
});

