export function extractLabels(title: string) {
    if (!title) return { displayTitle: title, labels: [] }

    const labels: string[] = []
    const tokens = title.split(/\s+/)
    const titleTokens: string[] = []

    tokens.forEach(token => {
        // Check for [Label] or (Label) pattern or underscores
        const hasBrackets = token.match(/^\[(.*?)\]$/) || token.match(/^\((.*?)\)$/)
        const hasUnderscore = token.includes('_')

        if (hasBrackets || hasUnderscore) {
            // It's a label candidate
            const clean = token
                .replace(/[\[\]\(\)]/g, '') // Remove all brackets and parens
                .replace(/_/g, ' ')     // Replace underscores with spaces
                .replace(/\b\w/g, c => c.toUpperCase()) // Title Case

            labels.push(clean)
        } else {
            // Regular word -> Title
            titleTokens.push(token)
        }
    })

    const newTitle = titleTokens.join(' ')
    return {
        displayTitle: newTitle || title, // Fallback to original if empty logic needs it, or just empty?
        labels
    }
}
