import Gio from "gi://Gio";
import GLib from "gi://GLib";
import FileHelpers from "./utils.js";

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

export function watchForMessages() {

}

export function getInputRemapperProxy(configDir?: string) {
    configDir ??= FileHelpers.getConfigPath();
    const proxy = Gio.DBusProxy.makeProxyWrapper<InputRemapperDbusApi>(interfaceXml);
    const dBusProxy = proxy(Gio.DBus.system, 'inputremapper.Control', '/inputremapper/Control');
    dBusProxy.set_config_dirSync(configDir);
    return dBusProxy;
}

// Pass the XML string to create a proxy class for that interface
const InputRemapperProxy = Gio.DBusProxy.makeProxyWrapper<InputRemapperDbusApi>(interfaceXml);


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
    helloSync(out: string): string;
    helloAsync(out: string): string;
}