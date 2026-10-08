/*
 * Wellbeing Panel — индикатор экранного времени в верхней панели GNOME.
 *
 * Источник данных о времени — встроенный Wellbeing / Screen Time.
 * Логика чтения инкапсулирована в src/usageReader.js (пока заглушка,
 * см. комментарий там: нужно определить реальный источник данных).
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {UsageReader} from './src/usageReader.js';
import {formatDuration} from './src/formatTime.js';

const PLACEHOLDER = '—';
const ICON_GLYPH = '\u23F1'; // ⏱

const WellbeingPanelButton = GObject.registerClass(
class WellbeingPanelButton extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Wellbeing Panel', false);

        this._extension = extension;

        this._label = new St.Label({
            text: PLACEHOLDER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._label);

        this._statusItem = new PopupMenu.PopupMenuItem('Экранное время: —', {
            reactive: false,
        });
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction('Настройки Wellbeing…', () => {
            GLib.spawn_command_line_async('gnome-control-center wellbeing');
        });
        this.menu.addAction('Настройки расширения…', () => {
            this._extension.openPreferences();
        });
    }

    refresh() {
        let text = PLACEHOLDER;
        try {
            const seconds = this._extension.reader.getTodayTotalSeconds();
            if (seconds === 0)
                text = formatDuration(0);
            else if (seconds != null && seconds > 0)
                text = formatDuration(seconds);
        } catch (e) {
            logError(e, 'wellbeing-panel: не удалось прочитать данные');
        }

        const showText = this._extension.settings.get_boolean('show-text');
        this._label.set_text(showText ? text : ICON_GLYPH);
        this._statusItem.label.set_text(`Экранное время: ${text}`);
    }
});

export default class WellbeingPanelExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._reader = new UsageReader({
            settings: this._settings,
        });

        this._button = new WellbeingPanelButton(this);
        Main.panel.addToStatusArea(this.uuid, this._button, 0, 'right');

        this._button.refresh();

        const interval = this._settings.get_uint('refresh-interval');
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            Math.max(interval, 5),
            () => {
                this._button.refresh();
                return GLib.SOURCE_CONTINUE;
            });
    }

    disable() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if (this._button) {
            this._button.destroy();
            this._button = null;
        }
        if (this._reader) {
            this._reader.destroy();
            this._reader = null;
        }
        this._settings = null;
    }

    get settings() {
        return this._settings;
    }

    get reader() {
        return this._reader;
    }
}
