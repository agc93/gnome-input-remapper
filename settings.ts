import Gio from 'gi://Gio';
import FileHelpers from "./utils.js";
import GLib from "gi://GLib";

function expandPath(path: string): string {
    if (path.startsWith('~/')) {
        return GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    }
    return path;
}

export class ExtensionSettings {
    private _configDir: string;
    private __configDirId: number;

    private _presetActionsEnabled: boolean;
    private __presetActionsEnabledId: number;
    private _notificationsEnabled: boolean;
    private __notificationsEnabledId: number;
    private _settings: Gio.Settings;
    constructor(settings: Gio.Settings) {
        this._settings = settings;
        this._configDir = settings.get_string('config-dir') ?? FileHelpers.getDefaultConfigPath();
        this.__configDirId = this._settings.connect('changed::config-dir', (settings: Gio.Settings) => {
            this._configDir = settings.get_string('config-dir') ?? FileHelpers.getDefaultConfigPath();
            log(`new value of config-dir: ${this._configDir}`);
        })
        this._presetActionsEnabled = this._settings.get_boolean('enable-preset-actions')
            ?? this._settings.get_default_value('enable-preset-actions')?.get_boolean()
            ?? false;
        this.__presetActionsEnabledId = this._settings.connect('changed::enable-preset-actions', (settings: Gio.Settings) => {
            this._presetActionsEnabled = settings.get_boolean('enable-preset-actions');
        });
        this._notificationsEnabled = this._settings.get_boolean('enable-notifications')
            ?? this._settings.get_default_value('enable-notifications')?.get_boolean()
            ?? true;
        this.__notificationsEnabledId = this._settings.connect('changed::enable-notifications', (settings: Gio.Settings) => {
            this._notificationsEnabled = settings.get_boolean('enable-notifications');
        });
    }

    private _signals: { [key: string]: {[key: string]: number}} = {}

    addWatch(id: string, settingsKey: string, callback: (settings: ExtensionSettings) => Promise<void>) {
        if (!this._signals[settingsKey]) this._signals[settingsKey] = {};
        this._signals[settingsKey][id] = this._settings.connect('changed::' + settingsKey, async (settings: Gio.Settings) => {
            await callback(this);
        });
    }

    addValueWatch<T>(id: string, settingsKey: string, callback: (value: T) => void, transformer: (settings: Gio.Settings, key: string) => T) {
        log(`adding settings watch ${id} for ${settingsKey}`);
        if (!this._signals[settingsKey]) {
            this._signals[settingsKey] = {};
        }
        this._signals[settingsKey][id] = this._settings.connect('changed::' + settingsKey, (settings: Gio.Settings) => {
            const value = transformer(settings, settingsKey);
            log(`got changed::${settingsKey} signal, invoking ${id} callback with value: ${value}`);
            callback(value);
        });
    }

    get configDir(): string {
        return expandPath(this._configDir);
    }

    get presetActionsEnabled(): boolean {
        // return SettingsLoader.boolean(false)(this._settings, 'enable-preset-actions');
        return this._presetActionsEnabled;
    }

    get notificationsEnabled(): boolean {
        return this._notificationsEnabled;
    }

}

export class SettingsLoader {
    static string(defaultValue: string): (changed: Gio.Settings, key: string) => string {
        return (settings, key) => {
            return settings.get_string(key) ?? settings.get_default_value(key)?.get_string()[0] ?? defaultValue;
        }
    }

    static boolean(defaultValue: boolean): (changed: Gio.Settings, key: string) => boolean {
        return (settings, key) => {
            return settings.get_boolean(key) ?? settings.get_default_value(key)?.get_boolean() ?? defaultValue;
        }
    }

    static number(key: string, defaultValue: number): (changed: Gio.Settings) => number {
        return settings => {
            return settings.get_int(key) ?? settings.get_default_value(key)?.get_int64() ?? defaultValue;
        }
    }
}

// function get_enum(key: string): number {
//     return Settings.getSettings.get_enum(key) ?? Settings.getSettings.get_default_value(key)?.get_string()[0];
// }
// function set_enum(key: string, val: number): boolean {
//     return Settings.getSettings.set_enum(key, val);
// }

export function getConfigDir(settings: ExtensionSettings): string {
    log(`getting config dir: ${settings.configDir}`);
    return settings.configDir ?? FileHelpers.getDefaultConfigPath();
}