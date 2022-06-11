const cookie = require('cookie')
const crypto = require('node:crypto')

const generateSID = crypto.randomUUID
const sessions = new Map()
const sessionIdCookieName = 'SID'

function createSession() {
    return { id: generateSID() }
}

function sessionMiddleware(ctx, next) {
    if (ctx.session != null) {
        next()
        return
    }

    const sessionId = ctx.request.cookie[sessionIdCookieName]
    const session = sessionId && sessions.get(sessionId)
    if (session == null) {
        const newSession = createSession()
        sessions.set(newSession.id, newSession)
        ctx.session = newSession

        const cookieAge = new Date()
        cookieAge.setFullYear(cookieAge.getFullYear() + 1)
        ctx.response.setHeader('Set-Cookie', cookie.serialize(sessionIdCookieName, newSession.id, {
            httpOnly: true,
            expires: cookieAge,
        }))
    } else {
        ctx.session = session
    }

    next()
}

module.exports = sessionMiddleware