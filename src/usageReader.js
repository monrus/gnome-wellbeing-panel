/*
 * Источник данных об экранном времени.
 *
 * Читает файл истории, который пишет gnome-shell и читает gnome-control-center
 * (панель Wellbeing):
 *   ~/.local/share/gnome-shell/session-active-history.json
 *
 * Файл содержит переходы состояния активности пользователя (idle/локировка/
 * suspend ↔ активность). Разбивки по приложениям нет — это суммарное активное
 * экранное время, как в Настройки → Wellbeing.
 *
 * Разбор и подсчёт вынесены в ./screenTime.js (чистая логика, тестируемая в gjs).
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {parseHistory, sumActiveSeconds} from './screenTime.js';

const SCREEN_TIME_LIMITS_SCHEMA = 'org.gnome.desktop.screen-time-limits';
const HISTORY_DIR = 'gnome-shell';
const HISTORY_FILENAME = 'session-active-history.json';

/** Возможные исходы чтения. */
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
            log(`wellbeing-panel: схема ${SCREEN_TIME_LIMITS_SCHEMA} недоступна: ${e.message}`);
        }

        this._historyFile = Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_user_data_dir(), HISTORY_DIR, HISTORY_FILENAME]));
    }

    /**
     * Прочитать суммарное экранное время за сегодня.
     *
     * @returns {{status: string, seconds: number|null}} status — одно из
     *   Status.*; seconds — секунды активности за сегодня (только при OK).
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
            // Файла нет / нет доступа: на новой системе данных ещё не накопилось,
            // либо запись выключена. Это не ошибка — просто нет данных.
            return {status: Status.UNAVAILABLE, seconds: null};
        }

        const nowSecs = Math.floor(GLib.get_real_time() / GLib.USEC_PER_SEC);
        const entries = parseHistory(text, nowSecs);

        if (entries === null || entries.length === 0) {
            this._warnOnce('не удалось разобрать файл истории экранного времени');
            return {status: Status.UNAVAILABLE, seconds: null};
        }

        const startOfTodaySecs = this._startOfTodaySecs(nowSecs);
        const seconds = sumActiveSeconds(entries, startOfTodaySecs, nowSecs);

        return {status: Status.OK, seconds};
    }

    /** Начало сегодняшнего дня (локальная полночь) в секундах Unix epoch. */
    _startOfTodaySecs(nowSecs) {
        const now = GLib.DateTime.new_from_unix_local(nowSecs);
        const midnight = GLib.DateTime.new_local(
            now.get_year(), now.get_month(), now.get_day_of_month(), 0, 0, 0);
        return midnight.to_unix();
    }

    /** Предупреждаем об ошибке один раз, чтобы не засорять журнал каждые 30 с. */
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
