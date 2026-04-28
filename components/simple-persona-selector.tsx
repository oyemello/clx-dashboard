"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface SimplePersonaSelectorProps {
    onPersonaChange: (persona: string | null) => void
    selectedPersona: string | null
}

export function SimplePersonaSelector({ onPersonaChange, selectedPersona }: SimplePersonaSelectorProps) {
    const [personas, setPersonas] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const res = await fetch('/api/personas')
                const data = await res.json()
                setPersonas(data.personas || [])
            } catch (e) {
                console.error("Failed to fetch personas", e)
            } finally {
                setLoading(false)
            }
        }
        fetchPersonas()
    }, [])

    return (
        <div className="flex items-center gap-2 px-4 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPersona || "all"} onValueChange={(val) => onPersonaChange(val === "all" ? null : val)}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Personas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Personas</SelectItem>
                    {personas.map((persona) => (
                        <SelectItem key={persona} value={persona}>
                            {persona}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
