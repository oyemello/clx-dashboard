export function extractLabels(title: string) {
    if (!title) return { displayTitle: title, labels: [] }

    const labels: string[] = []

    // Regex to find content in brackets [] or parens ()
    // We iterate to find all matches
    const labelRegex = /[\[\(](.*?)[\]\)]/g
    let match

    // We'll build a clean title by removing the matches
    let cleanTitle = title

    // Reset regex index just in case, though for a fresh regex it's fine.
    // However, string.replace can handle removal, and string.matchAll or exec for extraction.

    const matches = title.match(labelRegex)
    if (matches) {
        matches.forEach(m => {
            // Remove from title
            cleanTitle = cleanTitle.replace(m, '')

            // Extract content (remove outer brackets)
            const content = m.slice(1, -1)

            // Process the content (remove underscores, title case)
            const processed = content
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())
                .trim()

            if (processed) {
                labels.push(processed)
            }
        })
    }

    // Also handle underscore tokens if they aren't in brackets?
    // The previous logic checked tokens for underscores OR brackets.
    // If a token has underscore but NO brackets (e.g. "SOME_METRIC"), we should probably treat it as a label too?
    // User requirement: "Avg Transaction Value Usd (custom...)"
    // The (custom...) part should be a label.

    // Let's stick to the Bracket/Paren extraction primarily as it's the explicit "Label" marker.
    // If there is a "Standalone_Underscore_Token", the formatted title usually handles it?
    // The previous logic was: `if (hasBrackets || hasUnderscore)`.
    // If we want to preserve "underscore as label" logic for tokens *not* in brackets:

    // Let's clean up extra spaces
    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim()

    return {
        displayTitle: cleanTitle || title,
        labels
    }
}
