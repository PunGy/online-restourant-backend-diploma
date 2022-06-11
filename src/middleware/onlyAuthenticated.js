function onlyAuthorizedMiddleware(ctx, next) {
    if (ctx.user) {
        next()
    } else {
        ctx.response.send({
            error: 'Unauthorized',
        }, 401)
    }
}

module.exports = onlyAuthorizedMiddleware