/*
 * Форматирование длительности для панельного индикатора.
 */

/**
 * @param {number|null} totalSeconds длительность в секундах
 * @returns {string} например "3 ч 07 мин", "45 мин" или "—"
 */
export function formatDuration(totalSeconds) {
    if (totalSeconds == null || totalSeconds < 0)
        return '—';

    const seconds = Math.floor(totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0)
        return `${hours} ч ${String(minutes).padStart(2, '0')} мин`;

    return `${minutes} мин`;
}
