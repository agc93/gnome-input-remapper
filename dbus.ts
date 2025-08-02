import Gio from "gi://Gio";
import GLib from "gi://GLib";
import FileHelpers from "./utils.js";
import {ExtensionSettings} from "./settings.js";

// language=XML
const interfaceXml = `
<node>
    <interface name="inputremapper.Control">
        <method name="stop_injecting">
            <arg type="s" name="group_key" direction="in">
            </arg>
        </method>
        <method name="get_state">
            <arg type="s" name="group_key" direction="in">
            </arg>
            <arg type="s" name="response" direction="out">
            </arg>
        </method>
        <method name="start_injecting">
            <arg type="s" name="group_key" direction="in">
            </arg>
            <arg type="s" name="preset" direction="in">
            </arg>
            <arg type="b" name="response" direction="out">
            </arg>
        </method>
        <method name="stop_all">
        </method>
        <method name="set_config_dir">
            <arg type="s" name="config_dir" direction="in">
            </arg>
        </method>
        <method name="autoload">
        </method>
        <method name="autoload_single">
            <arg type="s" name="group_key" direction="in">
            </arg>
        </method>
        <method name="hello">
            <arg type="s" name="out" direction="in">
            </arg>
            <arg type="s" name="response" direction="out">
            </arg>
        </method>
        <method name="quit">
        </method>
    </interface>
</node>`;

export type InputRemapperProxy = InputRemapperDbusApi & Gio.DBusProxy

export class ProxyHandler {
    private _proxy: InputRemapperProxy;
    private _currentConfigDir: string;
    constructor(settings: ExtensionSettings) {
        this._currentConfigDir = settings.configDir;
        this._proxy = getInputRemapperProxy(this._currentConfigDir);
        settings.addWatch('config-dir', 'config-dir', async (settings: ExtensionSettings) => {
            this._currentConfigDir = settings.configDir;
            this._proxy = getInputRemapperProxy(settings.configDir);
        });
    }

    get proxy(): InputRemapperProxy {
        return this._proxy;
    }

    get currentConfigDir(): string {
        return this._currentConfigDir;
    }
}

function getInputRemapperProxy(configDir: string) {
    configDir ??= FileHelpers.getDefaultConfigPath();
    console.log(`getting input remapper proxy for config dir: ${configDir}`);
    const proxy = Gio.DBusProxy.makeProxyWrapper<InputRemapperDbusApi>(interfaceXml);
    const dBusProxy = proxy(Gio.DBus.system, 'inputremapper.Control', '/inputremapper/Control');
    dBusProxy.set_config_dirSync(configDir);
    return dBusProxy;
}

export interface InputRemapperDbusApi {
    stop_injectingRemote(group_key: string, callback: (value: unknown, error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    stop_injectingSync(group_key: string): void;
    stop_injectingAsync(group_key: string): Promise<void>;

    get_stateRemote(group_key: string, callback: (value: string[], error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    get_stateSync(group_key: string): string[];
    get_stateAsync(group_key: string): string[];

    start_injectingRemote(group_key: string, preset: string, callback: (value: boolean, error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    start_injectingSync(group_key: string, preset: string): boolean;
    start_injectingAsync(group_key: string, preset: string): Promise<boolean>;

    stop_allRemote(callback: (value: unknown, error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    stop_allSync(): void;
    stop_allAsync(): Promise<void>;

    set_config_dirRemote(config_dir: string, callback: (value: unknown, error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    set_config_dirSync(config_dir: string): void;
    set_config_dirAsync(config_dir: string): Promise<void>;

    autoloadRemote(callback: (value: unknown, error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    autoloadSync(): void;
    autoloadAsync(): Promise<void>;

    helloRemote(out: string, callback: (value: string, error: GLib.Error | null, fdList: Gio.UnixFDList | null) => void): void;
    helloSync(out: string): string[];
    helloAsync(out: string): string[];
}

export const getBusWatcher = (
    onRegistered: (connection: Gio.DBusConnection, name: string, owner: string) => void,
    onUnregistered: (connection: Gio.DBusConnection, name: string) => void
) => {
    const watcherId = Gio.bus_watch_name(
        Gio.BusType.SYSTEM,
        'inputremapper.Control',
        Gio.BusNameWatcherFlags.NONE,
        onRegistered,
        onUnregistered
    );
    return {
        watcherId,
        unwatch: () => Gio.bus_unwatch_name(watcherId),
    }
}