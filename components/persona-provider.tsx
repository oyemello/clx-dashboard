
"use client"

import * as React from "react"

type PersonaContextType = {
    selectedPersona: string | null
    setSelectedPersona: (persona: string | null) => void
}

const PersonaContext = React.createContext<PersonaContextType | undefined>(undefined)

export function PersonaProvider({ children }: { children: React.ReactNode }) {
    const [selectedPersona, setSelectedPersona] = React.useState<string | null>(null)

    // Optional: Load from localStorage
    React.useEffect(() => {
        const stored = localStorage.getItem("selected-persona")
        if (stored) {
            setSelectedPersona(stored)
        } else {
            // Default to CEO if available? Or just leave null
            // For now leave null to show "All Personas"
        }
    }, [])

    React.useEffect(() => {
        if (selectedPersona) {
            localStorage.setItem("selected-persona", selectedPersona)
        } else {
            localStorage.removeItem("selected-persona")
        }
    }, [selectedPersona])

    return (
        <PersonaContext.Provider value={{ selectedPersona, setSelectedPersona }}>
            {children}
        </PersonaContext.Provider>
    )
}

export function usePersona() {
    const context = React.useContext(PersonaContext)
    if (context === undefined) {
        throw new Error("usePersona must be used within a PersonaProvider")
    }
    return context
}
