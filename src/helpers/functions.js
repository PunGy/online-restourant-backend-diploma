function memorize(fn) {
    let cache = null
    return (...args) => {
        if (cache === null) {
            return cache = fn(...args)
        }
        return cache
    }
}

module.exports = {
    memorize,
}