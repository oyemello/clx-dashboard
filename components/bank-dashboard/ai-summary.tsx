"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

export function AIPerformanceSummary() {
    return (
        <Alert className="bg-muted/50 border-none">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertTitle className="flex items-center gap-2 text-blue-900">
                AI Insight
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Confidence: High</Badge>
            </AlertTitle>
            <AlertDescription className="text-blue-800 mt-2 text-sm leading-relaxed">
                Net contribution increased primarily due to higher interchange revenue in the <strong>Retail</strong> segment, while rewards cost remained within historical variation (+1.2%).
            </AlertDescription>
        </Alert>
    )
}
