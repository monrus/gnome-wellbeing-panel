/*
 * Настройки расширения Wellbeing Panel.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WellbeingPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Wellbeing Panel',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const appearance = new Adw.PreferencesGroup({
            title: 'Панель',
            description: 'Как отображается индикатор в верхней панели',
        });
        page.add(appearance);

        const showTextRow = new Adw.SwitchRow({
            title: 'Показывать время текстом',
            subtitle: 'Если выключено, отображается только значок',
        });
        settings.bind('show-text', showTextRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(showTextRow);

        const refreshRow = new Adw.SpinRow({
            title: 'Интервал обновления',
            subtitle: 'Секунды',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 600,
                step_increment: 5,
                page_increment: 30,
            }),
        });
        settings.bind('refresh-interval', refreshRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(refreshRow);
    }
}
