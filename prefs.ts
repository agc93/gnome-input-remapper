import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import FileHelpers from "./utils.js";

export default class GnomeRectanglePreferences extends ExtensionPreferences {
    _settings?: Gio.Settings

    fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        // @ts-ignore
        this._settings = this.getSettings();

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

        const paddingGroup = new Adw.PreferencesGroup({
            title: _('Paddings'),
            description: _('Configure the padding between windows'),
        });
        page.add(paddingGroup);

        const paddingInner = new Adw.SpinRow({
            title: _('Inner'),
            subtitle: _('Padding between windows'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 1000,
                stepIncrement: 1
            })
        });
        paddingGroup.add(paddingInner);

        window.add(page)

        this._settings!.bind('enable-preset-actions', presetActionsEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._settings!.bind('padding-inner', paddingInner, 'value', Gio.SettingsBindFlags.DEFAULT);
        this._settings!.bind('config-dir', configPathInner, 'text', Gio.SettingsBindFlags.DEFAULT);

        return Promise.resolve();
    }
}

export class ExtensionSettings {
    private configDir: string;
    constructor(settings: Gio.Settings) {
        this.configDir = settings.get_value('config-dir').deepUnpack() ?? FileHelpers.getConfigPath();
    }
}