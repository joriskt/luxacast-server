import colors from 'colors';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

winston.level = 'debug';

const format = winston.format.combine(
    winston.format.padLevels(),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.colorize(),
    winston.format.printf((info) => {
        const padding: number = info.message.length - info.message.trimLeft().length;
        return `${info.timestamp} [${' '.repeat(padding - 1)}${info.level}] ${
            info.group ? colors.grey(`[g:${info.group}] `) : ''
        }${info.client ? colors.grey(`[c:${info.client}] `) : ''}${info.message.trim()}`;
    })
);

winston.add(
    new winston.transports.Console({
        level: 'debug',
        format: format,
    })
);
winston.add(
    new winston.transports.File({
        level: 'verbose',
        dirname: 'logs',
        format: winston.format.combine(format, winston.format.uncolorize()),
    })
);

export default {
    APP_PORT: Number(process.env['APP_PORT'] || 8080),
};
