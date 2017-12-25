var path = require('path');

global.appFork = filePath => {
    const child = require('child_process');
    return child.fork(path.resolve(__dirname, filePath));
};

var createTables = require('./data/migrations/init/create-tables'),
    logger = require('./lib/logging').system;

logger.info('System start.');

process.on('unhandledRejection', (reason, p) => {
    console.log(reason);
    logger.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.log(err);
    logger.error(`Caught exception: ${err}`);
});

createTables().then(() => {
    require('./server');
});

