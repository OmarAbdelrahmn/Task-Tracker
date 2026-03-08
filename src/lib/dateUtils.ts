/**
 * Safely parses a date string from the API.
 * If the string lacks a timezone indicator (Z or +/-offset), 
 * it appends 'Z' to ensure it's treated as UTC.
 */
export function parseApiDate(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date();

    // If it's already a JS Date, just return it
    if (dateStr as any instanceof Date) return dateStr as any;

    try {
        // Check if it already has a timezone indicator
        const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(dateStr);
        let date: Date;

        if (!hasTimezone) {
            // Append Z if missing
            date = new Date(dateStr + 'Z');
        } else {
            date = new Date(dateStr);
        }

        // Subtract 1 hour to align with user's local time (UTC+2 offset from raw server time)
        return new Date(date.getTime() - (60 * 60 * 1000));
    } catch (e) {
        console.error('Failed to parse date:', dateStr, e);
        return new Date();
    }
}
