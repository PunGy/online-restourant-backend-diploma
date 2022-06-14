require('dotenv').config()
const RestLib = require('rest-library')
const { parseBodyMiddleware } = require('rest-library/utils')
const fs = require('fs')
const { stat } = require('fs/promises')
const crypto = require('crypto')

const busboy = require('busboy')

const connect = require('./database/connect')
const { addUser, getUserByCredentials } = require('./database/users.js')

const parseCookieMiddleware = require('./middleware/parseCookie.js')
const onlyAuthenticatedMiddleware = require('./middleware/onlyAuthenticated.js')
const authenticateMiddleware = require('./middleware/authenticate.js')
const sessionMiddleware = require('./middleware/session.js')
const { deleteSession, updateSession } = require('./database/sessions')

const parseFormDataBody = (ctx, next) => new Promise((resolve) => {
    const { request } = ctx
    if (request.headers['content-type'].includes('multipart/form-data')) {
        const bb = busboy({ headers: request.headers })
        ctx.request.body = {}
        bb.on('file', (name, file, info) => {
            const filename = `${crypto.randomUUID()}`
            const filetype = info.filename.split('.').pop()
            const filepath = `./images/${filename}.${filetype}`
            ctx.request.body[name] = { type: 'file', filepath, filename, filetype, info }
            file.pipe(fs.createWriteStream(filepath))
        })
        bb.on('field', (name, value, info) => {
            ctx.request.body[name] = { type: 'field', value, info }
        })
        bb.on('close', () => {
            next()
            resolve()
        })

        request.pipe(bb)
    }
})

const app = new RestLib()

app.use((ctx, next) => {
    ctx.response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
    ctx.response.setHeader('Access-Control-Allow-Credentials', 'true')
    ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    ctx.response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
    next()
})

app.notFound((ctx) => {
    ctx.response.setHeader('Access-Control-Allow-Origin', '*')
    ctx.response.status = 404
    ctx.response.send({error: 'Not found'})
})

app.error((ctx, error) => {
    console.error(error)

    ctx.response.send({
        error: error.message,
    }, 500)
})

app.use(parseBodyMiddleware)
app.use((ctx, next) => {
    console.log(`${ctx.request.method}: ${ctx.request.url}`)
    if (ctx.request.body != null) {
        console.log(ctx.request.body, '\n')
    } else {
        console.log()
    }

    next()
})
app.use(parseCookieMiddleware)
app.use(sessionMiddleware)
app.use(authenticateMiddleware)


/**
 * ----------- AUTHENTICATION -----------
 */

 function userBodyValidation (ctx, next) {
    const { body } = ctx.request

    if (body.email == null || body.password == null) {
        ctx.response.send({
            error: 'Invalid body',
        }, 400)
        return
    }

    ctx.userBody = body
    next()
}
app.post('/registration', userBodyValidation, async (ctx) => {
    const db = await connect()

    const user = await addUser(db, ctx.userBody)
    await updateSession(db, ctx.session.id, { userId: user.id })

    ctx.response.send(user)
})

app.post('/login', userBodyValidation, async (ctx) => {
    const db = await connect()
    const user = await getUserByCredentials(db, ctx.userBody.email, ctx.userBody.password)

    if (user) {
        await updateSession(db, ctx.session.id, { userId: user.id })
        ctx.response.send(user)
    } else {
        ctx.response.send({
            error: 'Invalid user data',
        }, 401)
    }
})

app.post('/logout', async (ctx) => {
    deleteSession(db, ctx.session.id)
    ctx.response.send({
        message: 'Logout successful',
    })
})

app.get('/users/current', onlyAuthenticatedMiddleware, (ctx) => {
    ctx.response.send(ctx.user)
})

/** IMAGES */

app.get('/images/:id', async (ctx) => {
    const db = await connect()
    const { id } = ctx.request.params
    const image = (await db.query('SELECT * FROM images WHERE id = $1', [id])).rows[0]

    if (image) {
        const path = `./images/${id}.${image.type}`
        const imageStats = await stat(path).catch(() => null)

        if (imageStats) {
            ctx.response.writeHead(200, {
                'Content-Type': `image/${image.type}`,
                'Content-Size': imageStats.size
            })
            const readImage = fs.createReadStream(path)

            //readImage.pipe(process.stdout)
            readImage.pipe(ctx.response)
        }
    }

})

/** PRODUCTS */

app.get('/products', async (ctx) => {
    const db = await connect()

    const products = (await db.query('SELECT * FROM products')).rows
    if (products.length) {
        ctx.response.send(products)
    } else {
        ctx.response.send({ error: 'No products found' })
    }
})
app.get('/products/:id', async (ctx) => {
    const db = await connect()

    const product = (await db.query('SELECT * FROM products WHERE id = $1', [ctx.params.id])).rows[0]

    if (product) {
        ctx.response.send(product)
    } else {
        ctx.response.send({ error: 'No product found' })
    }
})
app.post('/products', parseFormDataBody, async (ctx) => {
    const db = await connect()

    const product = ctx.request.body
    await db.query(`INSERT INTO images (id, title, type) VALUES ($1, $2, $3) RETURNING id`, [product.image.filename, product.image.info.filename, product.image.info.filetype])
    await db.query(`INSERT INTO products (title, description, price, image) VALUES ($1, $2, $3, $4)`, [product.title.value, product.description.value, +product.price.value, product.image.filename])
    ctx.response.send({ status: 'done' })
})

/** ORDER **/

app.all('/order/*', onlyAuthenticatedMiddleware)
app.get('/order', async (ctx) => {
    const db = await connect()

    const order = (await db.query('SELECT * FROM orders WHERE customer_id = $1', [ctx.user.id])).rows[0]
    if (order) {
        ctx.response.send(order)
    } else {
        ctx.response.send({ error: 'No order found' }, 404)
    }
})
app.post('/order', async (ctx) => {
    const db = await connect()

    let order = (await db.query('SELECT products FROM orders WHERE customer_id = $1', [ctx.user.id])).rows[0]
    if (order == null) {
        order = (await db.query('INSERT INTO orders (customer_id, products, status) VALUES ($1, $2, $3) RETURNING *', [ctx.user.id, ctx.request.body, 'active'])).rows[0]
    } else {
        const products = { ...order.products, ...ctx.request.body }
        order = (await db.query('UPDATE orders SET products = $1 WHERE customer_id = $2 RETURNING *', [JSON.stringify(products), ctx.user.id])).rows[0]
    }    

    ctx.response.send(order)
})
app.put('/order', async (ctx) => {
    const db = await connect()

    const order = (await db.query('SELECT products FROM orders WHERE customer_id = $1', [ctx.user.id])).rows[0]
    const products = { ...ctx.request.body, ...(order?.products ?? {}) }
    await db.query('UPDATE orders SET products = $1 WHERE customer_id = $2', [JSON.stringify(products), ctx.user.id])

    ctx.response.send({ products })
})
app.delete('/order', async (ctx) => {
    const db = await connect()

    await db.query('DELETE FROM orders WHERE customer_id = $1', [ctx.user.id])

    ctx.response.send({ status: 'done' })
})

/**  **/

app.listen(3001, () => {
    console.log('Server started on port 3001')
})