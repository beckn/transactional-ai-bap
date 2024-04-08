import ActionsService from '../services/Actions.js'
import AI from '../services/AI.js'

import logger from '../utils/logger.js'
import {db} from '../server.js'
import { v4 as uuidv4 } from 'uuid'
import MapsService from '../services/MapService.js'
import get_text_by_key from '../utils/language.js'
const mapService = new MapsService()


import CronService from '../services/CronService.js'
const actionsService = new ActionsService()

/**
* @deprecated
* @param {*} req 
* @param {*} res 
*/
async function process_wa_webhook(req, res) {
    try {
        const message = req.body.Body
        const sender = req.body.From
        const format = req.headers['content-type'] || 'text/xml';
        const raw_yn = req.body.raw_yn || false;
        
        const EMPTY_SESSION = {
            sessionId: sender,
            data : []
        }
        
        logger.info(`Received message from ${sender}: ${message}. Response format: ${format}`)
        
        // get or create session
        const  session_response = await db.get_session(sender);
        let session = session_response.data;
        if(!session_response.status){
            session = EMPTY_SESSION
        }
        
        // Process instruction
        const process_response = await actionsService.process_instruction(message, session.data)
        if (process_response.raw?.context?.action === 'search') {
            session = EMPTY_SESSION
        }
        if(process_response.formatted){
            session.data.push({ role: 'user', content: message });  // add user message to session
            if(process_response.raw && typeof process_response.raw === 'object'){
                session.data.push({ role: 'assistant', content: JSON.stringify(process_response.raw) }); // add system response to session
            }
            else{
                session.data.push({ role: 'assistant', content: process_response.formatted }); // add system response to session
            }
            
            await db.update_session(sender, session);
        }        
        
        // twiml.message(process_response.formatted)
        logger.info(`Sending formatted response to ${sender}: ${process_response.formatted}`)
        if(format!='application/json'){
            // res.type('text/xml').send(twiml.toString())
            await actionsService.send_message(sender, process_response.formatted)
            res.send("Done!")
        }
        else{
            raw_yn ? res.send(process_response.raw) : res.send(process_response.formatted)
        }
        
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`)
        res.status(400).send('Failed to process message')
    }
}

/**
* Function to process any text message received by the bot
* @param {*} req 
* @param {*} res 
*/
async function process_text(req, res) {
    let ai = new AI();
    
    // inputs
    let message = req.body.Body
    const sender = req.body.From
    const format = (req?.headers && req.headers['content-type']) || 'text/xml';
    const raw_yn = req.body.raw_yn || false;
    
    let response= {
        raw: null,
        formatted: null,
        media:null
    };
    
    const EMPTY_SESSION = {
        profile:{},
        sessionId: sender,
        text : [],
        actions : {
            raw: [],
            formatted: []
        },
        bookings: [],
        active_transaction: null,
        routes:[],
        selected_route:null
    }
    
    // Update lat, long
    if(req.body.Latitude && req.body.Longitude){
        message+=`Current location is:  lat:${req.body.Latitude} long:${req.body.Longitude}`
    }
    
    logger.info(`Received message from ${sender}: ${message}. Response format: ${format}`)
    
    // get or create session
    const  session_response = await db.get_session(sender);
    let session = session_response.data;
    if(!session_response.status){
        session = EMPTY_SESSION
    }
    
    try{
        
        // Get profile
        const profileResponse = await ai.get_profile_from_text(message, session.profile);
        if(profileResponse.status){
            session.profile = {
                ...session.profile, 
                ...profileResponse.data                
            };
        }
        
        logger.info(`\u001b[1;34m User profile : ${JSON.stringify(session.profile)}\u001b[0m`)
        
        
        ai.bookings = session.bookings;
        
        // check for booking collection
        
        let booking_collection = false; // await ai.check_if_booking_collection(message, [...session.text.slice(-1)]);
        if(booking_collection){
            logger.info(`Booking collection found!`);
            response.formatted = await ai.get_ai_response_to_query('Share the list of bookings to be made? Please include only hotels and tickets to be booked. It should be a short list with just names of bookings to be made. For e.g. Here is a list of bookings you need to make:  \n1. hotel at xyz \n2. Tickets for abc \nWhich one do you want to search first?', session.text);
            logger.info(`AI response: ${response.formatted}`);
            
            ai.bookings = await ai.get_bookings_array_from_text(response.formatted);
            ai.bookings = ai.bookings.bookings || ai.bookings;
            ai.bookings && ai.bookings.map(booking =>{
                booking.transaction_id = uuidv4();
            })
            
            session.text.push({ role: 'user', content: message }); 
            session.text.push({ role: 'assistant', content: response.formatted });
        }
        else{
            
            // get action
            ai.action = await ai.get_beckn_action_from_text(message, session.text, session.bookings);
            
            // Reset actions context if action is search
            if(ai.action?.action === 'search') {
                session.actions = EMPTY_SESSION.actions;
                session.active_transaction = ai.action.transaction_id || uuidv4();
            }
            
            
            if(ai.action?.action === 'clear_chat'){
                session = {
                    ...EMPTY_SESSION,
                    profile: session.profile
                };
                response.formatted = get_text_by_key('session_cleared');
            }
            else if(ai.action?.action === 'clear_all'){
                session = EMPTY_SESSION;
                response.formatted = get_text_by_key('session_and_profile_cleared');
            }
            else if(ai.action?.action === 'get_routes'){
                const routes = await mapService.generate_routes(message, session.text, session.avoid_point|| []);
                const formatting_response = await ai.format_response(routes.data?.routes_formatted || routes.errors, [{ role: 'user', content: message },...session.text]);
                response.formatted = formatting_response.message;
                session.routes = routes.data?.routes || session.routes;
                logger.info(`AI response: ${response.formatted}`);
                
                session.text.push({ role: 'user', content: message }); 
                session.text.push({ role: 'assistant', content: response.formatted });
            }
            else if(ai.action?.action === 'select_route'){
                const details_response = await ai.get_details_by_description(`Get the index of selected item based this input from user : ${message}`, [], `{index:1}`);
                let route_response = {
                    message: ''
                }
                if(details_response && details_response.index){
                    const index= Math.max(1-details_response.index,0);
                    session.selected_route = session.routes[index];
                    const url = `https://www.google.com/maps/dir/${session.selected_route.source_gps.lat},${session.selected_route.source_gps.lng}/${session.selected_route.destination_gps.lat},${session.selected_route.destination_gps.lng}/`;
                    route_response.message = get_text_by_key('route_selected', {url: url});
                    const map_image_url = await mapService.get_static_image_path([session.selected_route]);
                    if(map_image_url){
                        const map_image_url_server = await actionsService.download_file(map_image_url);
                        logger.info(`Image url : ${map_image_url_server}`)
                        if(map_image_url_server) response.media=[map_image_url_server]
                    }
                }
                const formatting_response = await ai.format_response(route_response, [{ role: 'user', content: message },...session.text]);
                response.formatted = formatting_response.message;

                logger.info(`AI response: ${response.formatted}`);
                
                session.text.push({ role: 'user', content: message }); 
                session.text.push({ role: 'assistant', content: response.formatted });
            }
            else if(ai.action?.action == null) {
                
                // get ai response
                response.formatted = await ai.get_ai_response_to_query(message, session.text);
                logger.info(`AI response: ${response.formatted}`);
                
                session.text.push({ role: 'user', content: message }); 
                session.text.push({ role: 'assistant', content: response.formatted });
                
            }
            else{
                
                session.bookings = ai.bookings;
                response = await process_action(ai.action, message, session, sender, format);
                ai.bookings = response.bookings;
                
                // update actions
                if(ai.action?.action === 'confirm') {
                    session.actions = EMPTY_SESSION.actions;
                    session.text = EMPTY_SESSION.text;
                }
                else if(response.formatted && response.raw){
                    session.actions.raw.push({ role: 'user', content: message }); 
                    session.actions.raw.push({ role: 'assistant', content: JSON.stringify(response.raw)}); 
                    
                    session.actions.formatted.push({ role: 'user', content: message }); 
                    session.actions.formatted.push({ role: 'assistant', content: response.formatted }); 
                    
                    session.text.push({ role: 'user', content: message }); 
                    session.text.push({ role: 'assistant', content: response.formatted }); 
                }
            }
            
        }
        
        // if(session.bookings && session.bookings.length>0) session.bookings = await ai.get_bookings_status(session.bookings, session.text);
        logger.info(`\u001b[1;34m Bookings status : ${JSON.stringify(ai.bookings)}\u001b[0m`)
        
        // update session
        session.bookings = ai.bookings;
        await db.update_session(sender, session);
        
        // Send response
        if(format!='application/json'){
            await actionsService.send_message(sender, response.formatted, response.media || [])
            res.send("Done!")
        }
        else (raw_yn && response.raw) ? res.send(response.raw) : res.send(response.formatted)
        
    }
    catch(e){
        logger.error(`Error processing message: ${e.message}`)
        res.status(400).send('Failed to process message')
    }
    
}

/**
* Function to process actions, it does not update the sessions
* Can be reused by gpt bots if required
* @param {*} action 
* @param {*} text 
* @param {*} session 
* @returns 
*/
async function process_action(action, text, session, sender=null, format='application/json'){
    let ai = new AI();
    let response = {
        raw: null,
        formatted: null,
        bookings: session.bookings
    }
    
    ai.action = action;
    ai.bookings = session.bookings;
    
    format!='application/json' && await actionsService.send_message(sender, get_text_by_key('request_in_progress'))
    
    // Get schema
    const schema = await ai.get_schema_by_action(action.action);
    
    // Get config
    let beckn_context = await ai.get_context_by_instruction(text, session.actions.raw);
    beckn_context.transaction_id = session.active_transaction;
    
    // Prepare request
    if(schema && beckn_context){
        let request=null;
        if(ai.action.action==='search'){
            let search_context = session.text;
            if(session.profile){
                search_context=[
                    { role: 'system', content: `User profile: ${JSON.stringify(session.profile)}`},
                    ...search_context
                ]
            }

            // check if user trying to search along the route
            const desired_struture = {
                search_on_route_yn: 'boolean depending upon whether user is trying to search along a route.',
                current_location: 'some location'
            }
            const details_response = await ai.get_details_by_description(`Find if user is trying to search along a route : ${text}`, session.text, JSON.stringify(desired_struture));
            if(details_response.search_on_route_yn){
                if(details_response.current_location){
                    const gps = await mapService.lookupGps(details_response.current_location);
                    if(gps)
                        text+= `\nMy current location is : ${JSON.stringify(gps)}`
                }
                else{
                    // ask for location.
                }
                
            }

            const message = await ai.get_beckn_message_from_text(text, search_context, beckn_context.domain, session.selected_route?.overview_polyline?.points);
            request = {
                status: true,
                data:{
                    method: 'POST',
                    url : `${beckn_context.base_url}/${beckn_context.action}`,
                    body: {
                        context: beckn_context,
                        message: message
                    }
                }
            }
        }
        else{
            request = await ai.get_beckn_request_from_text(text, session.actions.raw, beckn_context, schema, session.profile);
        }
        
        if(request.status){
            // call api
            const api_response = await actionsService.call_api(request.data.url, request.data.method, request.data.body, request.data.headers)
            format!='application/json' && await actionsService.send_message(sender, get_text_by_key('request_processed'))
            if(!api_response.status){
                logger.error(`Failed to call the API: ${api_response.error}`)
                response.formatted = get_text_by_key('request_failed')
            }
            else{
                
                response.raw = request.data.body.context.action==='search' ? await ai.compress_search_results(api_response.data) : api_response.data
                
                // update booking status
                if (ai.action && ai.action.action === 'confirm') {
                    response.bookings = ai.bookings.map(booking => {
                        if (booking.transaction_id === response.raw.context.transaction_id) {
                            booking.booked_yn = 1;
                        }
                        return booking;
                    });
                    logger.info(`Updated bookings: ${JSON.stringify(response.bookings)}`);
                }
                ai.bookings = response.bookings;
                
                const formatted_response = await ai.format_response(
                    api_response.data,
                    [...session.actions.formatted, { role: 'user', content: text }],
                    session.profile
                    );
                    response.formatted = formatted_response.message;
                } 
                
                
                
            }
            else{
                response.formatted = get_text_by_key('request_to_beckn_failed')
            }
        }
        
        return response;
    }
    export default {
        process_wa_webhook,
        process_text,
    }
