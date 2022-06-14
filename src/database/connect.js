const { Client } = require('pg')
const { memorize } = require('../helpers/functions.js')

async function connect() {
    const client = new Client()
    await client.connect()
    return client
}

module.exports = memorize(connect)
