"use client"

import { AIPerformanceSummary } from "@/components/bank-dashboard/ai-summary"
import { PageHeader } from "@/components/ui/page-header"

export default function AISummaryPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <PageHeader
                title="AI Summary"
                description="Automated insights and performance analysis."
            />
            <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full overflow-hidden">
                <div className="max-w-3xl">
                    <AIPerformanceSummary />
                </div>
            </div>
        </div>
    )
}
