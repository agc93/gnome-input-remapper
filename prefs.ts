import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// noinspection JSUnusedGlobalSymbols
export default class GnomeRectanglePreferences extends ExtensionPreferences {

    fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            iconName: 'dialog-information-symbolic',
        });

        const configGroup = new Adw.PreferencesGroup({
            title: _('Configure Input Remapper'),
            description: _('Set your Input Remapper preferences'),
        });
        page.add(configGroup);
        const configPathInner = new Adw.EntryRow({
            title: _('Configuration Directory Path'),
            editable: true
        });
        configGroup.add(configPathInner);

        const animationGroup = new Adw.PreferencesGroup({
            title: _('Interface'),
            description: _('Configure the extension\'s look and feel'),
        });
        page.add(animationGroup);

        const presetActionsEnabled = new Adw.SwitchRow({
            title: _('Preset Actions'),
            subtitle: _('Enable quickly editing preset configuration files.'),
        });
        animationGroup.add(presetActionsEnabled);

        const notificationsEnabled = new Adw.SwitchRow({
            title: _('Notifications'),
            subtitle: _('Enable the notifications when presets are started or stopped.'),
        });
        animationGroup.add(notificationsEnabled);

        window.add(page)

        settings!.bind('enable-preset-actions', presetActionsEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings!.bind('enable-notifications', notificationsEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings!.bind('config-dir', configPathInner, 'text', Gio.SettingsBindFlags.DEFAULT);

        return Promise.resolve();
    }
}

