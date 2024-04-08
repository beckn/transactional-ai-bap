import logger from '../utils/logger.js'
import redis from 'redis'

class DBService {
    
    constructor() {
        let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
        this.redisClient = redis.createClient({ url: redisUrl })

        this.redisClient.on('error', (err) => {
            logger.error('Redis Client Error', err)
        })

        this.redisClient.connect()
    }

    /**
     * Get session using Redis
     * @param {*} sessionId
     * @returns
     */
    async get_session(sessionId) {
        let response = {
            status: false,
        }
        try {
            let sessionData = await this.redisClient.get(sessionId)
            if (sessionData === null) {
                response.status = false
                response.message = 'Session does not exist!'
            } else {
                response.status = true
                response.message = 'Session retrieved successfully!'
                response.data = JSON.parse(sessionData)
            }
        } catch (err) {
            logger.error(err)
            response.error = err
        }

        logger.info(response)
        return response
    }

    /**
     * Deletes a session using Redis
     * @param {*} sessionId
     * @returns
     */
    async delete_session(sessionId) {
        let response = {
            status: false,
        }
        try {
            let deleteResponse = await this.redisClient.del(sessionId)
            if (deleteResponse === 0) {
                response.status = false
                response.message = 'Session does not exist!'
            } else {
                response.status = true
                response.message = 'Session deleted successfully!'
            }
        } catch (err) {
            logger.error(err)
            response.error = err
        }

        logger.info(response)
        return response
    }

    /**
     * Function to clear all sessions
     * @returns 
     */
    async clear_all_sessions(){
        let response = {
            status: false,
        }
        try {
            let deleteResponse = await this.redisClient.flushAll()
            if (deleteResponse === 0) {
                response.status = false
                response.message = 'Sessions do not exist!'
            } else {
                response.status = true
                response.message = 'Session flushed successfully!'
            }
        } catch (err) {
            logger.error(err)
            response.error = err
        }

        logger.info(response)
        return response
    }

    /**
     * Updates a session
     * @param {*} sessionId
     * @param {*} sessionData
     * @returns
     */
    async update_session(sessionId, sessionData) {
        let response = {
            status: false,
        }
        try {
            await this.redisClient.set(sessionId, JSON.stringify(sessionData))
            response.status = true
            response.message = 'Session updated successfully!'
        } catch (err) {
            logger.error(err)
            response.error = err
        }

        logger.info(response)
        return response
    }
    
    async get_all_sessions(){
        const sessions = [];
        let cursor = '0';
        
        try{
            do {
                // Use the SCAN command to iteratively retrieve keys that match the "session:*" pattern.
                const reply = await this.redisClient.scan(cursor, {
                    MATCH: '*',
                    COUNT: 100, // Adjust based on your expected load
                });
        
                cursor = reply.cursor;
                const keys = reply.keys;
        
                // For each key, get the session data and add it to the sessions array.
                for (let key of keys) {
                    const sessionData = await this.redisClient.get(key);
                    sessions.push({
                        key,
                        data: JSON.parse(sessionData),
                    });
                }
            } while (cursor !== 0);
        }
        catch(e){
            logger.error(e);
        }
        
        return sessions;
    }
    async set_data(key, data) {
        let response = {
            status: false,
        }
        try {
            await this.redisClient.set(key, JSON.stringify(data))
            response.status = true
            response.message = 'Data set successfully!'
        } catch (err) {
            logger.error(err)
            response.error = err
        }

        logger.info(response)
        return response
    }
    async get_data(key) {
        let response = {
            status: false,
        }
        try {
            const data = await this.redisClient.get(key)
            response.status = true
            response.message = 'Data fetched successfully!';
            response.data = JSON.parse(data)
        } catch (err) {
            logger.error(err)
            response.error = err
        }

        logger.info(response)
        return response}
}

export default DBService;