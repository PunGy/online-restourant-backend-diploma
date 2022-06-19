const { DatabaseError } = require('pg/lib')
const { getRowsToUpdate } = require('../helpers/database.js')

const getUser = async (db, userId) => {
    const r = await db.query('SELECT email, full_name, id, role FROM users WHERE id = $1', [userId])
    
    return r.rows[0]
}

const getUsers = async (db) => {
    const r = await db.query('SELECT id, full_name, email, role FROM users')
    
    return r.rows
}

const addUser = async (db, user) => {
    const r = await db.query('INSERT INTO users (email, full_name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role', [user.email, user.full_name, user.password, user.role ?? 'customer'])

    return r.rows[0]
}

const deleteUser = async (db, userId) => {
    const r = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, emai, rolel', [userId])

    return r.rows[0]
}

const updateUser = async (db, userId, userData) => {
    const rowsToUpdate = getRowsToUpdate(postData)

    const r = await db.query(
        `UPDATE users SET ${rowsToUpdate.join(', ')} WHERE id = $${rowsToUpdate.length + 1} RETURNING id, email, role`,
        Object.values(userData).concat(userId),
    )

    return r.rows[0]
}

const getUserByCredentials = async (db, login, password) => {
    const r = await db.query('SELECT id, email, full_name, role FROM users WHERE email = $1 AND password = $2', [login, password])

    return r.rows[0]
}

module.exports = {
    getUser,
    getUsers,
    addUser,
    deleteUser,
    updateUser,
    getUserByCredentials,
}
