"use client"

import * as React from "react"

type ColorTheme = "amex" | "slate"

interface ColorThemeContextType {
    colorTheme: ColorTheme
    setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = React.createContext<ColorThemeContextType | undefined>(undefined)

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
    const [colorTheme, setColorTheme] = React.useState<ColorTheme>("amex")

    React.useEffect(() => {
        const savedTheme = localStorage.getItem("color-theme") as ColorTheme
        if (savedTheme) {
            setColorTheme(savedTheme)
        }
    }, [])

    React.useEffect(() => {
        document.body.setAttribute("data-color-theme", colorTheme)
        localStorage.setItem("color-theme", colorTheme)
    }, [colorTheme])

    return (
        <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ColorThemeContext.Provider>
    )
}

export function useColorTheme() {
    const context = React.useContext(ColorThemeContext)
    if (context === undefined) {
        throw new Error("useColorTheme must be used within a ColorThemeProvider")
    }
    return context
}
