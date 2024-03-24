import { createLogger, format, transports } from 'winston'

const logger = createLogger({
    format: format.combine(
        format.colorize({
            level: true, // Colorize the level of each log message
            colors: {
                error: 'red',
                warn: 'yellow',
                info: 'green',
                verbose: 'cyan',
                debug: 'blue',
                silly: 'grey',
            }, // Custom colors
        }),
        format.simple() // Simple log format
    ),
    transports: [new transports.Console()],
})

export default logger
