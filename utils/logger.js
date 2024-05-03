import { createLogger, format, transports } from 'winston'
const colorizer = format.colorize();

const logger = createLogger({
    level: 'silly',
    format: format.combine(
        format((info) => {
            info.level = colorizer.colorize(info.level, `${info.level} ${info.message}`);
            info.message = '';
            return info;
        })(),
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
