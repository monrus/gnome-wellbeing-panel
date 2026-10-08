/*
 * Wellbeing Panel preferences.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WellbeingPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Wellbeing Panel',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const appearance = new Adw.PreferencesGroup({
            title: _('Panel'),
            description: _('How the indicator appears in the top bar'),
        });
        page.add(appearance);

        const showTextRow = new Adw.SwitchRow({
            title: _('Show time as text'),
            subtitle: _('If disabled, only the icon is shown'),
        });
        settings.bind('show-text', showTextRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(showTextRow);

        const refreshRow = new Adw.SpinRow({
            title: _('Refresh interval'),
            subtitle: _('Seconds'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 600,
                step_increment: 5,
                page_increment: 30,
            }),
        });
        settings.bind('refresh-interval', refreshRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(refreshRow);

        const dayGroup = new Adw.PreferencesGroup({
            title: _('Day boundary'),
            description: _('When “today” starts'),
        });
        page.add(dayGroup);

        const dayStartRow = new Adw.SpinRow({
            title: _('Start hour of the day'),
            subtitle: _('0 — midnight (matches Settings → Wellbeing), 3 — when GNOME resets its daily limit'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 23,
                step_increment: 1,
                page_increment: 1,
            }),
        });
        settings.bind('day-start-hour', dayStartRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        dayGroup.add(dayStartRow);
    }
}
