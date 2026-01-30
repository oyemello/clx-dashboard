"use client"

import * as React from "react"

const CARD_SETTINGS_STORAGE_KEY = "card-settings"

type CardSettings = {
    showLabels: boolean
    showTrend: boolean
    showSubtext: boolean
}

type CardSettingsContextType = CardSettings & {
    setShowLabels: (value: boolean) => void
    setShowTrend: (value: boolean) => void
    setShowSubtext: (value: boolean) => void
}

const CardSettingsContext = React.createContext<CardSettingsContextType | undefined>(undefined)

export function CardSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = React.useState<CardSettings>({
        showLabels: true,
        showTrend: true,
        showSubtext: true,
    })

    const [mounted, setMounted] = React.useState(false)

    // Load from localStorage on mount
    React.useEffect(() => {
        const stored = localStorage.getItem(CARD_SETTINGS_STORAGE_KEY)
        if (stored) {
            try {
                setSettings(JSON.parse(stored))
            } catch (e) {
                console.error("Failed to parse card settings", e)
            }
        }
        setMounted(true)
    }, [])

    // Save to localStorage on change
    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem(CARD_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
        }
    }, [settings, mounted])

    const value = React.useMemo(() => ({
        ...settings,
        setShowLabels: (val: boolean) => setSettings(s => ({ ...s, showLabels: val })),
        setShowTrend: (val: boolean) => setSettings(s => ({ ...s, showTrend: val })),
        setShowSubtext: (val: boolean) => setSettings(s => ({ ...s, showSubtext: val })),
    }), [settings])

    // Prevent hydration mismatch by returning children immediately if not mounted?
    // Actually, for client-side only settings that affect rendering, it's better to wait or use defaults?
    // Let's render children always but initial state matches default.
    // The flicker might happen if user changed defaults.
    // To avoid hydration mismatch on text content that depends on this, we might need to suppress or handle efficiently.
    // Since kpi-card is client component, it should be fine.

    return (
        <CardSettingsContext.Provider value={value}>
            {children}
        </CardSettingsContext.Provider>
    )
}

export function useCardSettings() {
    const context = React.useContext(CardSettingsContext)
    if (context === undefined) {
        throw new Error("useCardSettings must be used within a CardSettingsProvider")
    }
    return context
}
