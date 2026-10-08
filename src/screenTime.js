/*
 * Чистая логика разбора истории экранного времени GNOME.
 *
 * Источник — файл ~/.local/share/gnome-shell/session-active-history.json,
 * который пишет gnome-shell (js/misc/timeLimitsManager.js) и читает
 * gnome-control-center (панель Wellbeing).
 *
 * Формат: массив переходов состояния активности пользователя
 *   [{oldState, newState, wallTimeSecs}, ...]
 * где UserState: 0 = INACTIVE, 1 = ACTIVE; wallTimeSecs — секунды Unix epoch.
 *
 * Алгоритм подсчёта повторяет gnome-shell
 * TimeLimitsManager._calculateActiveTimeTodaySecs().
 *
 * Модуль намеренно не зависит от GNOME Shell — его можно запускать в gjs
 * и тестировать (см. tests/screenTime.test.js).
 */

/** Состояние пользователя. Значения зафиксированы форматом файла. */
export const USER_STATE = {
    INACTIVE: 0,
    ACTIVE: 1,
};

/**
 * Разобрать и провалидировать историю переходов.
 *
 * @param {string} text содержимое history-файла
 * @param {number|null} nowSecs текущее время в секундах; переходы из будущего
 *   (больше nowSecs) отбрасываются. Если null — проверка не выполняется.
 * @returns {Array<{oldState:number,newState:number,wallTimeSecs:number}>|null}
 *   массив валидных переходов, либо null, если файл структурно некорректен.
 */
export function parseHistory(text, nowSecs = null) {
    let raw;
    try {
        raw = JSON.parse(text);
    } catch {
        return null;
    }

    if (!Array.isArray(raw))
        return null;

    const entries = [];
    let prevWallTimeSecs = -1;

    for (const entry of raw) {
        if (typeof entry !== 'object' || entry === null)
            return null;

        const {oldState, newState, wallTimeSecs} = entry;

        if (oldState !== USER_STATE.INACTIVE && oldState !== USER_STATE.ACTIVE)
            return null;
        if (newState !== USER_STATE.INACTIVE && newState !== USER_STATE.ACTIVE)
            return null;
        if (oldState === newState)
            return null;
        if (typeof wallTimeSecs !== 'number' || !Number.isSafeInteger(wallTimeSecs))
            return null;
        if (wallTimeSecs < prevWallTimeSecs)
            return null;

        // Будущие переходы — следствие сбоя часов; пропускаем, как gnome-shell.
        if (nowSecs !== null && wallTimeSecs > nowSecs)
            continue;

        entries.push({oldState, newState, wallTimeSecs});
        prevWallTimeSecs = wallTimeSecs;
    }

    return entries;
}

/**
 * Сколько секунд пользователь был активен в интервале [rangeStart, rangeEnd).
 *
 * Повторяет gnome-shell TimeLimitsManager._calculateActiveTimeTodaySecs():
 * идём по переходам, при переходе в ACTIVE запоминаем начало, при переходе
 * из ACTIVE суммируем длительность; если последний переход — в ACTIVE,
 * добавляем всё до rangeEnd.
 *
 * @param {Array<{oldState:number,newState:number,wallTimeSecs:number}>} entries
 * @param {number} rangeStartSecs начало интервала (включительно)
 * @param {number} rangeEndSecs конец интервала (исключительно)
 * @returns {number} секунды активности
 */
export function sumActiveSeconds(entries, rangeStartSecs, rangeEndSecs) {
    let total = 0;
    // Если первый переход в диапазоне — ACTIVE→INACTIVE, значит активность
    // началась до диапазона (или он пуст), поэтому старт берём с его начала.
    let activeStartSecs = rangeStartSecs;

    const firstIdx = entries.findIndex(e => e.wallTimeSecs >= rangeStartSecs);

    if (firstIdx !== -1) {
        for (let i = firstIdx; i < entries.length; i++) {
            const entry = entries[i];

            if (entry.newState === USER_STATE.ACTIVE)
                activeStartSecs = entry.wallTimeSecs;
            else if (entry.oldState === USER_STATE.ACTIVE)
                total += Math.max(entry.wallTimeSecs - activeStartSecs, 0);
        }
    }

    const last = entries[entries.length - 1];
    if (last && last.newState === USER_STATE.ACTIVE)
        total += Math.max(rangeEndSecs - activeStartSecs, 0);

    return total;
}
