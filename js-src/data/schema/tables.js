module.exports = {
    accounts: {
        id: { type: 'string', maxlength: 24, nullable: false, primary: true },
        type: { type: 'string', nullable: false, defaultTo: 'ss' },
        user_id: { type: 'string', maxlength: 24, nullable: false },
        server_id: { type: 'string', maxlength: 24, nullable: false },
        port: { type: 'integer', nullable: false },
        password: { type: 'string', nullable: false },
        auto_remove: { type: 'boolean', defaultTo: false },
        method: { type: 'string', defaultTo: 'aes-256-cfb' },
        protocol: { type: 'string', defaultTo: '' },
        protocol_param: { type: 'string', defaultTo: '' },
        obfs: { type: 'string', defaultTo: '' },
        obfs_param: { type: 'string', defaultTo: '' },
        updated_at: { type: 'dateTime', nullable: false },
        created_at: { type: 'dateTime', nullable: false },
        flow: { type: 'bigInteger', defaultTo: 0 },
        enabled: { type: 'boolean', defaultTo: true }
    },
    flows: {
        id: { type: 'string', maxlength: 24, nullable: false, primary: true },
        server_id: { type: 'string', maxlength: 24, nullable: false },
        port: { type: 'integer', maxlength: 60, nullable: false, defaultTo: 0 },
        flow: { type: 'bigInteger', defaultTo: 0 },
        time: { type: 'bigInteger', nullable: false }
    }
};
