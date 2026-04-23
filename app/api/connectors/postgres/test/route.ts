import { NextResponse } from 'next/server'
import { Pool } from 'pg'

function parseConnector(connector: any) {
    const auth = connector?.auth || {}
    
    const host = auth.host
    const port = auth.port || 5432
    const database = auth.database
    const username = auth.username
    const password = auth.password
    const sslMode = auth.sslMode || 'disable'
    const connectionTimeout = (auth.connectionTimeout || 10) * 1000 // Convert to ms

    return { host, port, database, username, password, sslMode, connectionTimeout }
}

export async function POST(request: Request) {
    let pool: Pool | null = null
    
    try {
        const { connector } = await request.json()
        if (!connector) {
            return NextResponse.json({ ok: false, error: 'Missing connector config' }, { status: 400 })
        }

        const { host, port, database, username, password, sslMode, connectionTimeout } = parseConnector(connector)

        if (!host || !port || !database || !username || !password) {
            return NextResponse.json(
                {
                    ok: false,
                    error: 'Missing required PostgreSQL credentials (host, port, database, username, password)',
                    isConfigError: true
                },
                { status: 400 }
            )
        }

        // Build SSL config
        const ssl = sslMode !== 'disable' ? {
            rejectUnauthorized: sslMode === 'verify-full' || sslMode === 'verify-ca'
        } : false

        // Create connection pool
        pool = new Pool({
            host,
            port,
            database,
            user: username,
            password,
            ssl,
            connectionTimeoutMillis: connectionTimeout,
            idleTimeoutMillis: 30000,
            max: 1, // Single connection for test
        })

        // Test the connection
        const client = await pool.connect()
        const result = await client.query('SELECT 1')
        client.release()

        return NextResponse.json({
            ok: true,
            host,
            port,
            database,
            username,
            sslMode,
            hasCredentials: true,
        })
    } catch (error: any) {
        console.error('[PostgreSQL Test] Connection failed:', error)
        return NextResponse.json(
            {
                ok: false,
                error: error?.message || 'Connection check failed',
                isConfigError: true,
                hasCredentials: false,
            },
            { status: 500 }
        )
    } finally {
        if (pool) {
            await pool.end()
        }
    }
}
