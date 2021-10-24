import { Packet } from './packet';
import { WebSocket } from 'ws';

let nextId: number = 0;

export class Client {
    public readonly id: number;
    private readonly socket: WebSocket;

    constructor(socket: WebSocket) {
        this.id = nextId++;
        this.socket = socket;
    }

    send(packet: Packet): void {
        this.socket.send(JSON.stringify(packet));
    }
}
