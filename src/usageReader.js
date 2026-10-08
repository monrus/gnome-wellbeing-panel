/*
 * Источник данных об экранном времени.
 *
 * Сейчас это ЗАГЛУШКА: данных нет, метод возвращает null.
 *
 * Шаг 1 разработки — определить, откуда встроенный Wellbeing / Screen Time
 * берёт статистику, и читать её оттуда. Кандидаты:
 *   - история gnome-control-center (cc_screen_time_statistics_row_get_history_file);
 *   - D-Bus API GNOME Shell;
 *   - ~/.local/share/gnome-shell/session-active-history.json
 *     (содержит только интервалы активности сессии, без разбивки по приложениям).
 *
 * Реализация будет добавлена отдельным шагом после исследования.
 */

export class UsageReader {
    constructor({settings = null} = {}) {
        this._settings = settings;
    }

    /**
     * @returns {number|null} экранное время за сегодня в секундах,
     *   либо null, если данных пока нет (UI покажет прочерк).
     */
    getTodayTotalSeconds() {
        return null;
    }

    destroy() {
        this._settings = null;
    }
}
