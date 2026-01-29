import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'

/**
 * SERVER-ONLY: This file must never be imported into client components.
 * It handles secure credential loading and BigQuery connection.
 */

// Function to resolve credentials
function getBigQueryOptions(): BigQueryOptions {
    const projectIdFromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID
    const keyDirCandidate = path.join(process.cwd(), 'key')
    const findLocalKeyFile = () => {
        if (!fs.existsSync(keyDirCandidate)) return null
        const jsonFiles = fs.readdirSync(keyDirCandidate).filter(f => f.endsWith('.json'))
        if (jsonFiles.length === 0) return null
        return path.join(keyDirCandidate, jsonFiles[0])
    }

    const projectId = projectIdFromEnv

    // 1. Prefer GOOGLE_SERVICE_ACCOUNT_JSON (for Vercel/Production)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
            const resolvedProject = credentials.project_id || projectId
            if (!resolvedProject) throw new Error('Missing projectId for BigQuery (GOOGLE_SERVICE_ACCOUNT_JSON)')
            return {
                projectId: resolvedProject,
                credentials,
            }
        } catch (e) {
            console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', e)
        }
    }

    // 2. Fallback to GOOGLE_APPLICATION_CREDENTIALS (for Local/Cloud Run)
    const keyFileFromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (keyFileFromEnv) {
        if (!projectId) throw new Error('Missing projectId for BigQuery (GOOGLE_CLOUD_PROJECT/GOOGLE_PROJECT_ID)')
        return {
            projectId,
            keyFilename: path.isAbsolute(keyFileFromEnv) ? keyFileFromEnv : path.join(process.cwd(), keyFileFromEnv),
        }
    }

    // 2b. Bundled local key fallback (./key/*.json) for local dev
    const localKey = findLocalKeyFile()
    if (localKey) {
        try {
            const parsed = JSON.parse(fs.readFileSync(localKey, 'utf8'))
            const resolvedProject = parsed.project_id || projectId
            if (!resolvedProject) throw new Error('Missing projectId for BigQuery (local key missing project_id)')
            return {
                projectId: resolvedProject,
                keyFilename: localKey,
            }
        } catch (e) {
            console.error('Failed to read local key file', e)
        }
    }

    // 3. Default (might work if running on GCP resource with attached service account)
    if (!projectId) {
        throw new Error('Missing projectId for BigQuery; set GOOGLE_CLOUD_PROJECT/GOOGLE_PROJECT_ID or provide credentials with project_id')
    }
    return {
        projectId,
    }
}

// Initialize the BigQuery client
const bigquery = new BigQuery(getBigQueryOptions())

/**
 * Execute a parameterized query against BigQuery.
 * 
 * @param sql The SQL query string. Must use @param syntax for values.
 * @param params Object containing parameter values matching the SQL query.
 * @returns Array of rows typed as T.
 */
export async function queryBigQuery<T = any>(sql: string, params?: { [key: string]: any }): Promise<T[]> {
    if (!sql) {
        throw new Error('SQL query cannot be empty')
    }

    // Prevent basic string interpolation abuse (simple check, not exhaustive)
    // We rely on the developer using the `params` argument properly.

    const options = {
        query: sql,
        params,
    }

    try {
        const [rows] = await bigquery.query(options)
        return rows as T[]
    } catch (error) {
        console.error('BigQuery Query Error:', error)
        throw new Error('Failed to execute BigQuery query')
    }
}
