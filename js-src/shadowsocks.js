var logger = require('./lib/logging').system,
    dgram = require('dgram'),
    client = dgram.createSocket('udp4'),
    version = require('./package.json').version,
    exec = require('child_process').exec,
    moment = require('moment'),
    config = require('./config'),
    cron = require('./lib/cron'),
    knex = require('./lib/knex'),
    clientIp = {};

const host = config.shadowsocks.address.split(':')[0];
const port = +config.shadowsocks.address.split(':')[1];

let shadowsocksType = 'libev';
let lastFlow;
let existPort = [];
let existPortUpdatedAt = Date.now();
let firstFlow = true;

const sendPing = () => {
    client.send(new Buffer('ping'), port, host);
};

const setExistPort = flow => {
    existPort = [];
    for (const f in flow) {
        existPort.push(+f);
    }
    existPortUpdatedAt = Date.now();
};

const connect = () => {
    client.on('message', async(msg, rinfo) => {
        const msgStr = new String(msg);
        if (msgStr.substr(0, 4) === 'pong') {
            shadowsocksType = 'python';
        } else if (msgStr.substr(0, 5) === 'stat:') {
            let flow = JSON.parse(msgStr.substr(5));
            setExistPort(flow);
            const realFlow = compareWithLastFlow(flow, lastFlow);

            for (const rf in realFlow) {
                if (realFlow[rf]) {
                    (function(port) {
                        if (!clientIp[+port]) { clientIp[+port] = []; }
                        getIp(+port).then(ip => {
                            if (ip.length) {
                                clientIp[+port].push({ time: Date.now(), ip });
                            }
                        });
                    })(rf);
                }
            }

            logger.info(`Receive flow from shadowsocks: (${ shadowsocksType })\n${JSON.stringify(realFlow, null, 2)}`);
            lastFlow = flow;
            const insertFlow = Object.keys(realFlow).map(m => {
                return {
                    port: +m,
                    flow: +realFlow[m],
                    time: Date.now(),
                };
            }).filter(f => {
                return f.flow > 0;
            });
            const accounts = await knex('accounts').select(['port']);
            insertFlow.forEach(fe => {
                const account = accounts.filter(f => {
                    return fe.port === f.port;
                })[0];
                if (!account) {
                    sendMessage(`remove: {"server_port": ${ fe.port }}`);
                }
            });
            if (insertFlow.length > 0) {
                if (firstFlow) {
                    firstFlow = false;
                } else {
                    const insertPromises = [];
                    for (let i = 0; i < Math.ceil(insertFlow.length / 50); i++) {
                        const insert = knex('flows').insert(insertFlow.slice(i * 50, i * 50 + 50));
                        insertPromises.push(insert);
                    }
                    Promise.all(insertPromises).then();
                }
            }
        };
    });

    client.on('error', err => {
        logger.error(`client error: `, err);
    });
    client.on('close', () => {
        logger.error(`client close`);
    });
};

function sendMessage(message) {
    client.send(message, port, host);
    return Promise.resolve('ok');
};

const startUp = async() => {
    client.send(new Buffer('ping'), port, host);
    if (config.runShadowsocks === 'python') {
        sendMessage(`remove: {"server_port": 65535}`);
    }
    const accounts = await knex('accounts').select(['port', 'password']);
    accounts.forEach(f => {
        sendMessage(`add: {"server_port": ${ f.port }, "password": "${ f.password }"}`);
    });
};

const resend = async() => {
    if (Date.now() - existPortUpdatedAt >= 180 * 1000) {
        existPort = [];
    }
    const accounts = await knex('accounts').select(['port', 'password']);
    accounts.forEach(f => {
        if (existPort.indexOf(f.port) < 0) {
            sendMessage(`add: {"server_port": ${ f.port }, "password": "${ f.password }"}`);
        }
    });
};

const compareWithLastFlow = (flow, lastFlow) => {
    if (shadowsocksType === 'python') {
        return flow;
    }
    const realFlow = {};
    if (!lastFlow) {
        for (const f in flow) {
            if (flow[f] <= 0) { delete flow[f]; }
        }
        return flow;
    }
    for (const f in flow) {
        if (lastFlow[f]) {
            realFlow[f] = flow[f] - lastFlow[f];
        } else {
            realFlow[f] = flow[f];
        }
    }
    if (Object.keys(realFlow).map(m => realFlow[m]).sort((a, b) => a > b)[0] < 0) {
        return flow;
    }
    for (const r in realFlow) {
        if (realFlow[r] <= 0) { delete realFlow[r]; }
    }
    return realFlow;
};

connect();
startUp();
cron.minute(() => {
    resend();
    sendPing();
}, 1);

const checkPortRange = (port) => {
    if (!config.shadowsocks.portRange) { return true; }
    const portRange = config.shadowsocks.portRange.split(',');
    let isInRange = false;
    portRange.forEach(f => {
        if (f.indexOf('-') >= 0) {
            const range = f.trim().split('-');
            if (port >= +range[0] && port <= +range[1]) {
                isInRange = true;
            }
        } else if (port === +f) {
            isInRange = true;
        }
    });
    return isInRange;
};

const addAccount = async(port, password) => {
    try {
        if (!checkPortRange(port)) {
            return Promise.reject('error');
        }
        const insertAccount = await knex('accounts').insert({
            port,
            password,
        });
        await sendMessage(`add: {"server_port": ${ port }, "password": "${ password }"}`);
        return { port, password };
    } catch (err) {
        return Promise.reject(err);
    }
};

const removeAccount = async(port) => {
    try {
        const deleteAccount = await knex('accounts').where({
            port,
        }).delete();
        if (deleteAccount <= 0) {
            return Promise.reject('error');
        }
        await knex('flows').where({
            port,
        }).delete();
        await sendMessage(`remove: {"server_port": ${ port }}`);
        return { port };
    } catch (err) {
        return Promise.reject(err);
    }
};

const changePassword = async(port, password) => {
    try {
        const updateAccount = await knex('accounts').where({ port }).update({
            password,
        });
        if (updateAccount <= 0) {
            return Promise.reject('error');
        }
        await sendMessage(`remove: {"server_port": ${ port }}`);
        await sendMessage(`add: {"server_port": ${ port }, "password": "${ password }"}`);
        return { port, password };
    } catch (err) {
        return Promise.reject(err);
    }
};

const listAccount = async() => {
    try {
        const accounts = await knex('accounts').select(['port', 'password']);
        return accounts;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getFlow = async(options) => {
    try {
        const startTime = moment(options.startTime || new Date(0)).toDate().getTime();
        const endTime = moment(options.endTime || new Date()).toDate().getTime();

        const accounts = await knex('accounts').select(['port']);
        const flows = await knex('flows').select(['port'])
            .sum('flow as sumFlow').groupBy('port')
            .whereBetween('time', [startTime, endTime]);
        accounts.map(m => {
            const flow = flows.filter(f => {
                return f.port === m.port;
            })[0];
            if (flow) {
                m.sumFlow = flow.sumFlow;
            } else {
                m.sumFlow = 0;
            }
            return m;
        });
        if (options.clear) {
            await knex('flows').whereBetween('time', [startTime, endTime]).delete();
        }
        return accounts;
    } catch (err) {
        logger.error(err);
        return Promise.reject(err);
    }
};

const getVersion = () => {
    return { version };
};

const getIp = port => {
    const cmd = `netstat -ntu | grep ":${ port } " | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | grep -v 127.0.0.1 | uniq -d`;
    return new Promise((resolve, reject) => {
        exec(cmd, function(err, stdout, stderr) {
            if (err) {
                reject(stderr);
            } else {
                const result = [];
                stdout.split('\n').filter(f => f).forEach(f => {
                    if (result.indexOf(f) < 0) { result.push(f); }
                });
                resolve(result);
            }
        });
    });
};

const getClientIp = port => {
    const result = [];
    if (!clientIp[port] || clientIp[port].length === 0) { return result; }
    const recentIp = clientIp[port][clientIp[port].length - 1].ip;
    clientIp[port] = clientIp[port].filter(m => {
        return Date.now() - m.time <= 60 * 60 * 1000;
    });
    clientIp[port].forEach(ci => {
        ci.ip.forEach(i => {
            if (result.indexOf(i) < 0) { result.push(i); }
        });
    });
    if (!result.length) {
        clientIp[port].push({ time: Date.now(), ip: recentIp });
        return recentIp;
    }
    return result;
};

exports.addAccount = addAccount;
exports.removeAccount = removeAccount;
exports.changePassword = changePassword;
exports.listAccount = listAccount;
exports.getFlow = getFlow;
exports.getVersion = getVersion;
exports.getClientIp = getClientIp;
