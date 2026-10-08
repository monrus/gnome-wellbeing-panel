/*
 * Pure parsing/summing logic for GNOME screen time history.
 *
 * Source: ~/.local/share/gnome-shell/session-active-history.json, written by
 * gnome-shell (js/misc/timeLimitsManager.js) and read by gnome-control-center
 * (the Wellbeing panel).
 *
 * Format: an array of user activity state transitions
 *   [{oldState, newState, wallTimeSecs}, ...]
 * where UserState is 0 = INACTIVE, 1 = ACTIVE; wallTimeSecs is seconds since
 * the Unix epoch.
 *
 * The summing algorithm mirrors gnome-shell
 * TimeLimitsManager._calculateActiveTimeTodaySecs().
 *
 * This module deliberately does not depend on GNOME Shell, so it can run under
 * gjs and be unit-tested (see tests/screenTime.test.js).
 */

import GLib from 'gi://GLib';

/** User state. The values are fixed by the on-disk file format. */
export const USER_STATE = {
    INACTIVE: 0,
    ACTIVE: 1,
};

/**
 * Start of the current day, in seconds since the Unix epoch, for a given start
 * hour.
 *
 * Computed in local time (system time zone); DST transitions are handled by
 * GLib. If the chosen hour has not occurred yet today, the corresponding time
 * on the previous day is returned.
 *
 * @param {number} nowSecs current time, seconds since the Unix epoch
 * @param {number} dayStartHour day start hour, 0–23 (0 = midnight)
 * @returns {number} seconds since the Unix epoch at the start of the current day
 */
export function startOfDaySecs(nowSecs, dayStartHour = 0) {
    const now = GLib.DateTime.new_from_unix_local(nowSecs);
    let start = GLib.DateTime.new_local(
        now.get_year(), now.get_month(), now.get_day_of_month(), dayStartHour, 0, 0);

    if (now.compare(start) < 0)
        start = start.add_days(-1);

    return start.to_unix();
}

/**
 * Parse and validate the transition history.
 *
 * @param {string} text contents of the history file
 * @param {number|null} nowSecs current time in seconds; transitions from the
 *   future (greater than nowSecs) are dropped. Unset means: do not check.
 * @returns {Array<{oldState:number,newState:number,wallTimeSecs:number}>|null}
 *   array of valid transitions, or null if the file is structurally invalid.
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

        // Future transitions come from clock skew; skip them, like gnome-shell.
        if (nowSecs !== null && wallTimeSecs > nowSecs)
            continue;

        entries.push({oldState, newState, wallTimeSecs});
        prevWallTimeSecs = wallTimeSecs;
    }

    return entries;
}

/**
 * How many seconds the user was active within [rangeStart, rangeEnd).
 *
 * Mirrors gnome-shell TimeLimitsManager._calculateActiveTimeTodaySecs(): walk
 * the transitions, remember the start on a transition into ACTIVE, and add the
 * duration on a transition out of ACTIVE; if the last transition is into
 * ACTIVE, add everything up to rangeEnd.
 *
 * @param {Array<{oldState:number,newState:number,wallTimeSecs:number}>} entries
 * @param {number} rangeStartSecs start of the range (inclusive)
 * @param {number} rangeEndSecs end of the range (exclusive)
 * @returns {number} seconds of activity
 */
export function sumActiveSeconds(entries, rangeStartSecs, rangeEndSecs) {
    let total = 0;
    // If the first transition in the range is ACTIVE->INACTIVE, activity began
    // before the range (or the range is empty), so start counting from its start.
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
