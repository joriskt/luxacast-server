import { WebSocket } from 'ws';

let nextId: number = 0;

export class Client {
    public readonly id: number;
    public readonly socket: WebSocket;

    constructor(socket: WebSocket) {
        this.id = nextId++;
        this.socket = socket;
    }
}
