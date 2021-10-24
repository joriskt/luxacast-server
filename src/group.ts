import { EventPacket, Packet, eventPacket, statePacket } from './packet';
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

        this.logger = winston.child({
            group: this.name,
        });
    }

    /*
        Network
    */

    private broadcast(packet: Packet): void {
        this.logger.verbose(`Broadcasting: ${JSON.stringify(packet)}`);
        for (const client of this.clients.values()) {
            client.send(packet);
        }
    }

    private broadcastState(): void {
        this.broadcast(statePacket(this.data));
    }

    broadcastEvent(event: string, payload: any): void {
        this.broadcast(eventPacket(event, payload));
    }

    /*
        Client
    */

    subscribe(client: Client): void {
        this.clients.push(client);
        this.logger.info(`Subscribed: ${client.id}`);

        // Important: Send the initial state to the client!
        client.send(statePacket(this.data));
    }

    unsubscribe(client: Client): void {
        // The client is removed, and the expiry date is moved back to now + 4 hours.
        this.clients = this.clients.filter((cl) => cl != client);
        this.expires = DateTime.now().plus({ hours: 4 });
        this.logger.info(`Unsubscribed: ${client.id}`);
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

    set(key: string, value: string | number | boolean | null): void {
        this.logger.debug(`Setting: ${key}`);
        this.data[key] = true;
        this.broadcastState();
    }

    delete(key: string): void {
        this.logger.debug(`Deleting: ${key}`);
        delete this.data[key];
        this.broadcastState();
    }

    /*
        Pruning
    */

    isAlive(): boolean {
        return this.clients.length > 0 || this.expires > DateTime.now();
    }
}
