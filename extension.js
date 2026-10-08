/*
 * Wellbeing Panel — a screen time indicator in the GNOME top bar.
 *
 * The time data comes from the built-in Wellbeing / Screen Time. The reading
 * logic lives in src/usageReader.js, parsing and summing in src/screenTime.js.
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {UsageReader, Status} from './src/usageReader.js';
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

        this._statusItem = new PopupMenu.PopupMenuItem(_('Screen time today: —'), {
            reactive: false,
        });
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction(_('Wellbeing Settings…'), () => {
            GLib.spawn_command_line_async('gnome-control-center wellbeing');
        });
        this.menu.addAction(_('Extension Settings…'), () => {
            this._extension.openPreferences();
        });
    }

    refresh() {
        let text = PLACEHOLDER;
        let statusText = _('Screen time today: —');

        try {
            const {status, seconds} = this._extension.reader.readToday();

            if (status === Status.OK && seconds != null) {
                text = formatDuration(seconds, _);
                statusText = _('Screen time today: %s').replace('%s', text);
            } else if (status === Status.DISABLED) {
                statusText = _('Screen time recording is disabled');
            } else {
                statusText = _('No screen time data');
            }
        } catch (e) {
            logError(e, 'wellbeing-panel: failed to read screen time data');
        }

        const showText = this._extension.settings.get_boolean('show-text');
        this._label.set_text(showText ? text : ICON_GLYPH);
        this._statusItem.label.set_text(statusText);
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
