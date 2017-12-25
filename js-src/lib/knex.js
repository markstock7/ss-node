var config = require('../config'),
    knex = require('knex')({
        client: config.db.client,
        connection: {
          filename: (process.env.HOME || process.env.USERPROFILE) + "/.ss-node/data.sqlite"
        },
        acquireConnectionTimeout: 10000
    });

module.exports = knex;
