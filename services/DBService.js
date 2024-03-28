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
}

export default DBService;