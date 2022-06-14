const cookie = require('cookie')
const crypto = require('node:crypto')
const connect = require('../database/connect.js')

const { addSession, getSession } = require('../database/sessions.js')

const generateSID = crypto.randomUUID
const sessionIdCookieName = 'SID'

function createSession() {
    return { id: generateSID() }
}

async function sessionMiddleware(ctx, next) {
    if (ctx.session != null) {
        next()
        return
    }
    const db = await connect()
    const sessionId = ctx.request.cookie[sessionIdCookieName]
    const session = sessionId && await getSession(db, sessionId)
    if (session == null) {

        const newSession = createSession()
        await addSession(db, newSession)
        ctx.session = newSession

        const cookieAge = new Date()
        cookieAge.setFullYear(cookieAge.getFullYear() + 1)
        ctx.response.setHeader('Set-Cookie', cookie.serialize(sessionIdCookieName, newSession.id, {
            httpOnly: true,
            expires: cookieAge,
            sameSite: 'Strict',
            path: '/'
        }))
    } else {
        ctx.session = session
    }

    next()
}

module.exports = sessionMiddleware