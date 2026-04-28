import { NextResponse } from 'next/server'
import { getBigQueryClient } from '@/lib/bigquery/client'

import fs from 'fs'
import path from 'path'

function parseConnector(connector: any) {
    const jsonContent = connector?.auth?.jsonContent
    const keyFile = connector?.auth?.keyFile

    let credentials = undefined

    if (jsonContent) {
        try {
            credentials = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent
        } catch (e) {
            // Fall through and let the caller know credentials failed to parse
        }
    } else if (keyFile && typeof keyFile === 'string') {
        // Handle local key file path (e.g. from seeded connectors)
        try {
            const fullPath = path.isAbsolute(keyFile) ? keyFile : path.join(process.cwd(), keyFile)
            if (fs.existsSync(fullPath)) {
                credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
            }
        } catch (e) {
            console.warn("Failed to read key file:", keyFile)
        }
    }

    const projectId =
        connector?.metadata?.project ||
        credentials?.project_id ||
        process.env.GOOGLE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT

    return { credentials, projectId }
}

export async function POST(request: Request) {
    try {
        const { connector } = await request.json()
        if (!connector) {
            return NextResponse.json({ ok: false, error: 'Missing connector config' }, { status: 400 })
        }

        // Handle Simulation Provider or Project (Mock/Sample Data)
        if (connector.metadata?.provider === 'simulation' || connector.metadata?.project === 'clx-simulation') {
            return NextResponse.json({
                ok: true,
                projectId: connector.metadata?.project || 'simulation',
                hasCredentials: true,
                isEnvAuth: false,
                location: connector.metadata?.defaultLocation || 'US',
                isSimulation: true
            })
        }

        const { credentials, projectId } = parseConnector(connector)
        if (!projectId) {
            return NextResponse.json({ ok: false, error: 'Project ID is required', isConfigError: true }, { status: 400 })
        }

        const location = connector?.metadata?.defaultLocation || 'US'

        const client = getBigQueryClient({
            projectId,
            credentials,
            location
        })

        await client.query('SELECT 1')

        // Check if we are using environment-based auth (no dynamic credentials provided)
        const isEnvAuth = !credentials && (!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !!process.env.GOOGLE_APPLICATION_CREDENTIALS)

        return NextResponse.json({
            ok: true,
            projectId,
            hasCredentials: !!credentials || isEnvAuth,
            isEnvAuth,
            location,
        })
    } catch (error: any) {
        console.error('BigQuery Test Error:', error)
        return NextResponse.json(
            {
                ok: false,
                error: error?.message || 'Connection check failed',
                isConfigError: true,
                hasCredentials: false,
            },
            { status: 500 }
        )
    }
}
