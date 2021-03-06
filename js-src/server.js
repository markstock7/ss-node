var logger = require('./lib/logging').system,
    knex = require('./lib/knex'),
    crypto = require('crypto'),
    path = require('path'),
    config = require('./config'),
    password = config.manager.password,
    host = config.manager.address.split(':')[0],
    port = +config.manager.address.split(':')[1],
    shadowsocks = require('./shadowsocks'),
    net = require('net');

const receiveData = (receive, data) => {
    receive.data = Buffer.concat([receive.data, data]);
    checkData(receive);
};

const checkCode = (data, password, code) => {
    const time = Number.parseInt(data.slice(0, 6).toString('hex'), 16);
    if (Math.abs(Date.now() - time) > 10 * 60 * 1000) {
        return false;
    }
    const command = data.slice(6).toString();
    const md5 = crypto.createHash('md5').update(time + command + password).digest('hex');
    return md5.substr(0, 8) === code.toString('hex');
};

const receiveCommand = async(data, code) => {
    try {
        const time = Number.parseInt(data.slice(0, 6).toString('hex'), 16);
        // await knex('command').whereBetween('time', [0, Date.now() - 10 * 60 * 1000]).del();
        // await knex('command').insert({
        //     code: code.toString('hex'),
        //     time,
        // });
        const message = JSON.parse(data.slice(6).toString());
        logger.info(message);
        if (message.command === 'add') {
            const port = +message.port;
            const password = message.password;
            return shadowsocks.addAccount(port, password);
        } else if (message.command === 'del') {
            const port = +message.port;
            return shadowsocks.removeAccount(port);
        } else if (message.command === 'list') {
            return shadowsocks.listAccount();
        } else if (message.command === 'pwd') {
            const port = +message.port;
            const password = message.password;
            return shadowsocks.changePassword(port, password);
        } else if (message.command === 'flow') {
            const options = message.options;
            return shadowsocks.getFlow(options);
        } else if (message.command === 'version') {
            return shadowsocks.getVersion();
        } else if (message.command === 'ip') {
            return shadowsocks.getClientIp(message.port);
        } else {
            return Promise.reject();
        }
    } catch (err) {
        throw err;
    }
};

const pack = (data) => {
    const message = JSON.stringify(data);
    const dataBuffer = Buffer.from(message);
    const length = dataBuffer.length;
    const lengthBuffer = Buffer.from(('0000' + length.toString(16)).substr(-4), 'hex');
    const pack = Buffer.concat([lengthBuffer, dataBuffer]);
    return pack;
};

const checkData = (receive) => {
    const buffer = receive.data;
    let length = 0;
    let data;
    let code;
    if (buffer.length < 2) {
        return;
    }
    length = buffer[0] * 256 + buffer[1];
    if (buffer.length >= length + 2) {
        data = buffer.slice(2, length - 2);
        code = buffer.slice(length - 2);
        if (!checkCode(data, password, code)) {
            receive.socket.end();
            return;
        }
        receiveCommand(data, code).then(s => {
            receive.socket.end(pack({ code: 0, data: s }));
        }, e => {
            logger.error(e);
            receive.socket.end(pack({ code: 1 }));
        });
        if (buffer.length > length + 2) {
            checkData(receive);
        }
    }
};

const server = net.createServer(socket => {
    const receive = {
        data: Buffer.from(''),
        socket: socket,
    };
    socket.on('data', data => {
        receiveData(receive, data);
    });
    socket.on('end', () => {
        // console.log('end');
    });
    socket.on('close', () => {
        // console.log('close');
    });
}).on('error', (err) => {
    logger.error(`socket error: `, err);
});

server.listen({
    port,
    host,
}, () => {
    logger.info(`server listen on ${ host }:${ port }`);
});
