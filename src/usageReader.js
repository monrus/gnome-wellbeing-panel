/*
 * Screen time data source.
 *
 * Reads the history file written by gnome-shell and read by gnome-control-center
 * (the Wellbeing panel):
 *   ~/.local/share/gnome-shell/session-active-history.json
 *
 * The file contains user activity state transitions (idle/lock/suspend <->
 * active). There is no per-application breakdown — this is the total active
 * screen time, like in Settings -> Wellbeing.
 *
 * Parsing and summing live in ./screenTime.js (pure logic, testable under gjs).
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {parseHistory, sumActiveSeconds, startOfDaySecs} from './screenTime.js';

const SCREEN_TIME_LIMITS_SCHEMA = 'org.gnome.desktop.screen-time-limits';
const HISTORY_DIR = 'gnome-shell';
const HISTORY_FILENAME = 'session-active-history.json';

/** Possible read outcomes. */
export const Status = {
    OK: 'ok',
    DISABLED: 'disabled',
    UNAVAILABLE: 'unavailable',
};

export class UsageReader {
    constructor({settings = null} = {}) {
        this._settings = settings;
        this._screenTimeLimits = null;
        this._warned = false;

        try {
            this._screenTimeLimits = Gio.Settings.new(SCREEN_TIME_LIMITS_SCHEMA);
        } catch (e) {
            log(`wellbeing-panel: schema ${SCREEN_TIME_LIMITS_SCHEMA} is unavailable: ${e.message}`);
        }

        this._historyFile = Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_user_data_dir(), HISTORY_DIR, HISTORY_FILENAME]));
    }

    /**
     * Read the total screen time for today.
     *
     * @returns {{status: string, seconds: number|null}} status is one of
     *   Status.*; seconds is the activity seconds for today (only when OK).
     */
    readToday() {
        if (this._screenTimeLimits &&
            !this._screenTimeLimits.get_boolean('history-enabled'))
            return {status: Status.DISABLED, seconds: null};

        let text;
        try {
            const [, bytes] = this._historyFile.load_contents(null);
            text = new TextDecoder().decode(bytes);
        } catch (e) {
            // File missing / not accessible: a fresh system has no data yet, or
            // recording is disabled. Not an error — simply no data.
            return {status: Status.UNAVAILABLE, seconds: null};
        }

        const nowSecs = Math.floor(GLib.get_real_time() / GLib.USEC_PER_SEC);
        const entries = parseHistory(text, nowSecs);

        if (entries === null || entries.length === 0) {
            this._warnOnce('failed to parse the screen time history file');
            return {status: Status.UNAVAILABLE, seconds: null};
        }

        const dayStartHour = this._settings ? this._settings.get_uint('day-start-hour') : 0;
        const startOfTodaySecs = startOfDaySecs(nowSecs, dayStartHour);
        const seconds = sumActiveSeconds(entries, startOfTodaySecs, nowSecs);

        return {status: Status.OK, seconds};
    }

    /** Warn about an error once, to avoid flooding the journal every 30 s. */
    _warnOnce(message) {
        if (this._warned)
            return;
        this._warned = true;
        log(`wellbeing-panel: ${message}`);
    }

    destroy() {
        this._settings = null;
        this._screenTimeLimits = null;
        this._historyFile = null;
    }
}
