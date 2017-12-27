module.exports = {
    accounts: {
        port: { type: 'integer', nullable: false },
        password: { type: 'string', nullable: false },
    },
    flows: {
        port: { type: 'integer', maxlength: 60, nullable: false, defaultTo: 0 },
        flow: { type: 'bigInteger', defaultTo: 0 },
        time: { type: 'bigInteger', nullable: false }
    }
};
