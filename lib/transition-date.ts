/**
 * Builds the transition timestamp: the calendar date the user picked (if any)
 * combined with the given time of day (UTC), which preserves entry order within a day.
 * Returns null if the date string is not a real calendar date.
 */
export function buildTransitionTimestamp(transitionDate?: string, now: Date = new Date()): string | null {
    if (!transitionDate) return now.toISOString()

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(transitionDate)
    if (!match) return null
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]

    const combined = new Date(Date.UTC(
        year, month - 1, day,
        now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()
    ))
    // Reject dates that Date.UTC would silently roll over (e.g. 2026-02-31)
    if (combined.getUTCFullYear() !== year || combined.getUTCMonth() !== month - 1 || combined.getUTCDate() !== day) {
        return null
    }
    return combined.toISOString()
}
