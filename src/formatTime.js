/*
 * Duration formatting for the panel indicator.
 */

/**
 * @param {number|null} totalSeconds duration in seconds
 * @param {(s: string) => string} [gettext] translation function (identity by
 *   default), so the module stays pure and testable.
 * @returns {string} e.g. "3 h 07 min", "45 min" or "—"
 */
export function formatDuration(totalSeconds, gettext = s => s) {
    if (totalSeconds == null || totalSeconds < 0)
        return '—';

    const seconds = Math.floor(totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0)
        return gettext('%d h %s min')
            .replace('%d', String(hours))
            .replace('%s', String(minutes).padStart(2, '0'));

    return gettext('%d min').replace('%d', String(minutes));
}
