var Promise = require('bluebird'),
    tables = require('../../schema/tables.js'),
    logging = require('../../../lib/logging'),
    _ = require('lodash'),
    knex = require('../../../lib/knex'),
    schemaTables = Object.keys(tables);

module.exports = function createTables() {
    return Promise.mapSeries(schemaTables, (table) => {
        logging.system.info('Creating table: ' + table);
        return createTable(table, true);
    });
};


function createTable(table) {
    return knex.schema.hasTable(table)
        .then(function(exists) {
            if (exists) {
                return;
            }

            return knex.schema.createTable(table, function(t) {
                var columnKeys = _.keys(tables[table]);
                _.each(columnKeys, function(column) {
                    return addTableColumn(table, t, column);
                });
            });
        });
}

function addTableColumn(tableName, table, columnName) {
    var column,
        columnSpec = tables[tableName][columnName];

    // creation distinguishes between text with fieldtype, string with maxlength and all others
    if (columnSpec.type === 'text' && columnSpec.hasOwnProperty('fieldtype')) {
        column = table[columnSpec.type](columnName, columnSpec.fieldtype);
    } else if (columnSpec.type === 'string') {
        if (columnSpec.hasOwnProperty('maxlength')) {
            column = table[columnSpec.type](columnName, columnSpec.maxlength);
        } else {
            column = table[columnSpec.type](columnName, 191);
        }
    } else {
        column = table[columnSpec.type](columnName);
    }

    if (columnSpec.hasOwnProperty('nullable') && columnSpec.nullable === true) {
        column.nullable();
    } else {
        column.nullable(false);
    }
    if (columnSpec.hasOwnProperty('primary') && columnSpec.primary === true) {
        column.primary();
    }
    if (columnSpec.hasOwnProperty('unique') && columnSpec.unique) {
        column.unique();
    }
    if (columnSpec.hasOwnProperty('unsigned') && columnSpec.unsigned) {
        column.unsigned();
    }
    if (columnSpec.hasOwnProperty('references')) {
        // check if table exists?
        column.references(columnSpec.references);
    }
    if (columnSpec.hasOwnProperty('defaultTo')) {
        column.defaultTo(columnSpec.defaultTo);
    }
}


function addColumn(tableName, column, transaction) {
    return (transaction || knex).schema.table(tableName, function(table) {
        addTableColumn(tableName, table, column);
    });
}

function dropColumn(table, column, transaction) {
    return (transaction || knex).schema.table(table, function(table) {
        table.dropColumn(column);
    });
}

function addUnique(table, column, transaction) {
    return (transaction || knex).schema.table(table, function(table) {
        table.unique(column);
    });
}

function dropUnique(table, column, transaction) {
    return (transaction || knex).schema.table(table, function(table) {
        table.dropUnique(column);
    });
}
