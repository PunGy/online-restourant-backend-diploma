const addSession = async (db, session) => {
    const { id, ...sessionData } = session
    const data = JSON.stringify(sessionData)
    const r = await db.query('INSERT INTO sessions (id, data) VALUES ($1, $2) RETURNING id, data', [session.id, data])
    const insertedSession = r.rows[0]

    return insertedSession
}

const getSession = async (db, sessionId) => {
    const r = await db.query('SELECT id, data FROM sessions WHERE id = $1', [sessionId])
    if (r.rows[0] != null) {
        const sessionRaw = r.rows[0]
        const sessionData = JSON.parse(sessionRaw.data)
        const session = { id: sessionRaw.id, ...sessionData }

        return session
    }
    return null
}

const deleteSession = async (db, sessionId) => {
    const r = await db.query('DELETE FROM sessions WHERE id = $1', [sessionId])

    return r.rowCount === 1
}

const updateSession = async (db, sessionId, sessionData) => {
    const r = await db.query(
        `UPDATE sessions SET data = $1 WHERE id = $2 RETURNING id, data`,
        [JSON.stringify(sessionData), sessionId]
    )

    return r.rows[0]
}

module.exports = {
    addSession,
    getSession,
    deleteSession,
    updateSession,
}