const cookie = require('cookie')

function parseCookie(ctx, next) {
    const rawCookie = ctx.request.headers.cookie
    ctx.request.cookie = {}
    
    if (rawCookie) {
        Object.assign(ctx.request.cookie, cookie.parse(rawCookie))
    }
    
    next()
}

module.exports = parseCookie