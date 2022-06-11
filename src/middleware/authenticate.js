const connect = require('../database/connect.js')
const { getUser } = require('../database/users.js')

async function authenticateMiddleware(ctx, next) {
    if (ctx.session.userId != null) {
        const db = await connect()
        
        const user = await getUser(db, ctx.session.userId)

        ctx.user = user
    }

    next()
}

module.exports = authenticateMiddleware