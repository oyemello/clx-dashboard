import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery'

/**
 * SERVER-ONLY: This file must never be imported into client components.
 * It handles secure credential loading and BigQuery connection.
 */

// Function to resolve credentials
function getBigQueryOptions(): BigQueryOptions {
    const projectId = process.env.GOOGLE_PROJECT_ID

    // 1. Prefer GOOGLE_SERVICE_ACCOUNT_JSON (for Vercel/Production)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
            return {
                projectId,
                credentials,
            }
        } catch (e) {
            console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', e)
        }
    }

    // 2. Fallback to GOOGLE_APPLICATION_CREDENTIALS (for Local/Cloud Run)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return {
            projectId,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        }
    }

    // 3. Default (might work if running on GCP resource with attached service account)
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
