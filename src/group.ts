import winston, { Logger } from 'winston';

import { Client } from './client';
import { DateTime } from 'luxon';
import colors from 'colors';

export class Group {
    public readonly name: string;
    public readonly logger: Logger;

    private data: Record<string, boolean>;
    private clients: Client[];
    private expires: DateTime;

    constructor(name: string) {
        this.name = name;
        this.data = {};
        this.clients = [];
        this.expires = DateTime.now().plus({ minutes: 30 });

        this.logger = winston.createLogger({
            level: 'debug',
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.padLevels(),
                        winston.format.timestamp({
                            format: 'dd-MM-YYYY HH:mm:ss.SSS',
                        }),
                        winston.format.colorize(),
                        winston.format.printf((info) => {
                            const padding: number =
                                info.message.length - info.message.trimLeft().length;

                            return `${info.timestamp} ${colors.gray(`[group:${this.name}]`)} [${
                                ' '.repeat(padding - 1) + info.level
                            }] ${info.message.trim()}`;
                        })
                    ),
                }),
            ],
        });
    }

    /*
        Client
    */

    subscribe(client: Client): void {
        this.clients.push(client);
        this.logger.info(`Subscribed: ${client.id}`);

        // Important: Send the initial state to the client!
        client.socket.send(JSON.stringify(this.data));
    }

    unsubscribe(client: Client): void {
        // The client is removed, and the expiry date is moved back to now + 4 hours.
        this.clients = this.clients.filter((cl) => cl != client);
        this.expires = DateTime.now().plus({ hours: 4 });
        this.logger.info(`Unsubscribed: ${client.id}`);
    }

    private broadcast(data: any): void {
        this.logger.verbose(`Broadcasting: ${data}`);
        for (const value of this.clients.values()) {
            value.socket.send(data);
        }
    }

    private broadcastData(): void {
        this.broadcast(JSON.stringify(this.data));
    }

    /*
        Data
    */

    getAll(): Record<string, boolean> {
        return Object.assign({}, this.data);
    }

    get(key: string): boolean {
        return this.data[key] || false;
    }

    set(key: string): void {
        this.logger.debug(`Setting: ${key}`);
        this.data[key] = true;
        this.broadcastData();
    }

    delete(key: string): void {
        this.logger.debug(`Deleting: ${key}`);
        delete this.data[key];
        this.broadcastData();
    }

    /*
        Pruning
    */

    isAlive(): boolean {
        return this.clients.length > 0 || this.expires > DateTime.now();
    }
}
