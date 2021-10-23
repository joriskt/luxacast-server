import express, { Request, Response } from 'express';

import { Client } from './client';
import { Group } from './group';
import { WebSocket } from 'ws';
import addWs from 'express-ws';
import winston from 'winston';

winston.level = 'debug';
winston.add(
    new winston.transports.Console({
        level: 'debug',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'dd-MM-YYYY HH:mm:ss.SSS',
            }),
            winston.format.colorize(),
            winston.format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`)
        ),
    })
);

/*
    ExpresJS
*/

const app = express();
addWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

/*
    Groups
*/

const groups: Record<string, Group> = {};

function getGroup(name: string) {
    return groups[name] || (groups[name] = new Group(name));
}

function prune() {
    let visited: number = 0;
    let pruned: number = 0;

    for (const [name, group] of Object.entries(groups)) {
        visited++;

        // We don't prune groups so long as there are sockets listening to them.
        if (group.isAlive()) {
            continue;
        }

        pruned++;
        delete groups[name];
        winston.verbose(`Pruning group: ${name}`);
    }
}

setInterval(prune, 60000);

/*
    Rest API
*/

router.get('/:groupId', (req: Request<{ groupId: string }>, res: Response) => {
    const group: Group = getGroup(req.params.groupId);
    return res.status(200).json(group.getAll());
});

router.put('/:groupId/:key', (req: Request<{ groupId: string; key: string }>, res: Response) => {
    const group: Group = getGroup(req.params.groupId);
    group.set(req.params.key);
    return res.status(200).json(group.getAll());
});

router.delete('/:groupId/:key', (req: Request<{ groupId: string; key: string }>, res: Response) => {
    const group: Group = getGroup(req.params.groupId);
    group.delete(req.params.key);
    return res.status(200).json(group.getAll());
});

/*
    WebSockets
*/

router.ws('/:groupId', (ws: WebSocket, req: Request) => {
    // Fetch the group and construct the client.
    const group: Group = getGroup(req.params.groupId);
    const client: Client = new Client(ws);

    winston.info(`Client ${client.id} connected: ${group.name}`);

    // Subscribe the client to the group.
    group.subscribe(client);

    // We do NOT care about ANY data received from the WebSocket. It is READ ONLY.
    // ws.on('message', (data: RawData, isBinary: boolean) => {});

    // Lastly, do some error handling.
    ws.on('error', (err: Error) => {
        winston.error(`Client ${client.id} error: ${err}`);
    });

    ws.on('close', (code: number, reason: Buffer) => {
        winston.info(`Client ${client.id} disconnected: ${reason.toString('utf-8')}`);
        group.unsubscribe(client);
    });
});

/*
    Initialization
*/

app.use(router);
app.listen(8080);
