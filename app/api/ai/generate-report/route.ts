import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// In-memory cache: Map<metricId, { timestamp: number, report: string, dataHash: string }>
const reportCache = new Map<string, { timestamp: number, report: string, dataHash: string }>()

export async function POST(request: NextRequest) {
    try {
        const { metricId, metricLabel, value, trend } = await request.json()

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 })
        }

        // Simple hash of the data to verify freshness
        const dataHash = JSON.stringify({ value, trend })

        // Check cache
        const cached = reportCache.get(metricId)
        if (cached && cached.dataHash === dataHash) {
            console.log(`[AI Cache] Hit for ${metricId}`)
            return NextResponse.json({ report: cached.report })
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })

        console.log(`[AI] Generating report for ${metricId}...`)

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use a fast/efficient model
            messages: [
                {
                    role: "system",
                    content: "You are a senior financial analyst for a bank. Provide a concise, 3-sentence insight report for the given metric. Focus on the current performance and potential actions. Do not use markdown headers, just plain text or bullet points."
                },
                {
                    role: "user",
                    content: `Analyze the following metric:\nMetric: ${metricLabel}\nCurrent Value: ${value}\nTrend Context: ${JSON.stringify(trend)}`
                }
            ],
        })

        const report = completion.choices[0].message.content || "No analysis generated."

        // Update cache
        reportCache.set(metricId, {
            timestamp: Date.now(),
            report,
            dataHash
        })

        return NextResponse.json({ report })

    } catch (error) {
        console.error('AI Generation Error:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
