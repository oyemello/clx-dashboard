import { NextResponse } from 'next/server'
import { Pool } from 'pg'

function parseConnector(connector: any) {
    const auth = connector?.auth || {}
    
    const host = auth.host
    const port = auth.port || 5432
    const database = auth.database
    const username = auth.username
    const password = auth.password
    const schema = auth.schema || 'public'
    const sslMode = auth.sslMode || 'disable'
    const connectionTimeout = (auth.connectionTimeout || 10) * 1000 // Convert to ms

    return { host, port, database, username, password, schema, sslMode, connectionTimeout }
}

export async function POST(request: Request) {
    let pool: Pool | null = null
    
    try {
        const { connector } = await request.json()
        if (!connector) {
            return NextResponse.json({ error: 'Missing connector config' }, { status: 400 })
        }

        const { host, port, database, username, password, schema, sslMode, connectionTimeout } = parseConnector(connector)

        if (!host || !port || !database || !username || !password) {
            return NextResponse.json(
                { error: 'Missing required PostgreSQL credentials' },
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
            max: 2, // Allow 2 connections for discovery
        })

        const client = await pool.connect()

        try {
            // Get list of schemas
            const schemasResult = await client.query(
                `SELECT schema_name FROM information_schema.schemata 
                 WHERE schema_name NOT IN ('pg_catalog', 'information_schema') 
                 ORDER BY schema_name`
            )
            const schemas = schemasResult.rows.map((r: any) => r.schema_name)

            const discovery = {
                totalDatasets: 0,
                totalTables: 0,
                lastRefreshed: new Date().toISOString(),
                schemaHash: '',
                debugHost: host,
                debugDatabase: database,
                datasets: [] as any[],
            }

            // For each schema, get tables
            for (const schemaName of schemas) {
                // Get tables in this schema
                const tablesResult = await client.query(
                    `SELECT table_name, table_type 
                     FROM information_schema.tables 
                     WHERE table_schema = $1
                     ORDER BY table_name`,
                    [schemaName]
                )

                const tableDetails = []

                for (const tableRow of tablesResult.rows) {
                    const tableName = tableRow.table_name
                    const tableType = tableRow.table_type === 'VIEW' ? 'view' : 'table'

                    // Get columns for this table
                    const columnsResult = await client.query(
                        `SELECT column_name, data_type, is_nullable
                         FROM information_schema.columns
                         WHERE table_schema = $1 AND table_name = $2
                         ORDER BY ordinal_position`,
                        [schemaName, tableName]
                    )

                    // Get row count
                    let rowCount = 0
                    try {
                        const countResult = await client.query(
                            `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}"`
                        )
                        rowCount = parseInt(countResult.rows[0]?.count || '0', 10)
                    } catch (e) {
                        // Row count might fail for views or permission issues
                        rowCount = 0
                    }

                    tableDetails.push({
                        id: tableName,
                        tableId: tableName,
                        type: tableType,
                        rowCount,
                        numRows: rowCount,
                        schema: columnsResult.rows.map((col: any) => ({
                            name: col.column_name,
                            type: col.data_type,
                            mode: col.is_nullable === 'YES' ? 'NULLABLE' : 'REQUIRED',
                        })),
                        description: '',
                    })
                }

                if (tableDetails.length > 0) {
                    discovery.datasets.push({
                        id: schemaName,
                        datasetId: schemaName,
                        schemaName: schemaName,
                        tables: tableDetails,
                    })
                    discovery.totalTables += tableDetails.length
                }
            }

            discovery.totalDatasets = discovery.datasets.length
            discovery.schemaHash = JSON.stringify(discovery.datasets).split('').reduce((a: number, b: string) => {
                a = ((a << 5) - a) + b.charCodeAt(0)
                return a & a
            }, 0).toString()

            client.release()
            return NextResponse.json(discovery)
        } catch (error) {
            client.release()
            throw error
        }
    } catch (error: any) {
        console.error('[PostgreSQL Discovery] Discovery failed:', error)
        return NextResponse.json(
            { error: error?.message || 'Discovery failed' },
            { status: 500 }
        )
    } finally {
        if (pool) {
            await pool.end()
        }
    }
}
