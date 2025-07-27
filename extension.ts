import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import FileHelpers, {default as paths, openInputRemapperUi, runAfter} from './utils.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {getIconButton, PresetMenuItem} from './components.js'
import {getBusWatcher, ProxyHandler} from './dbus.js';
import {NotificationManager} from "./notifications.js";
import {ExtensionSettings, SettingsLoader} from "./settings.js";

type ImplPopupMenu =  PopupMenu.PopupMenu;

export class DeviceSubMenu extends PopupMenu.PopupSubMenuMenuItem {
    private _deviceState?: string;
    private _stopAction!: PopupMenu.PopupMenuItem;
    private _notifications: NotificationManager;
    private _stateLabel?: St.Label //GLib';
        ;
    private _proxy: ProxyHandler;
    private _settings: ExtensionSettings;
    static {
        // GObject.registerClass({Signals: {updated: {param_types: []}}}, DeviceSubMenu);
        GObject.registerClass(this);
    }

    get deviceName(): string {
        return GLib.path_get_basename(this.deviceDirectory);
    }

    get deviceState(): string {
        return this._deviceState ?? this.getDeviceState();
    }

    private deviceDirectory: string;
    constructor(settings: ExtensionSettings, directory: string) {
        const dirName = GLib.path_get_basename(directory);
        super(dirName, true);
        this._settings = settings;
        this._proxy = new ProxyHandler(settings);
        this.deviceDirectory = directory;
        const titleItem = this.getHeader();
        this.menu.addMenuItem(titleItem);
        this.addStopAction();

        this.setMenuIcon();
        this._notifications = new NotificationManager(this._settings);

    }

    private getHeader(): PopupMenu.PopupBaseMenuItem {
        const titleItem = new PopupMenu.PopupSeparatorMenuItem("State: ");
        this._stateLabel = new St.Label({text: this.deviceState});
        titleItem.actor.add_child(this._stateLabel);
        return titleItem;
    }

    private getDeviceState(): string {
        const state = this._proxy.proxy.get_stateSync(this.deviceName);
        // log(`got device state: ${state}`, state);
        const normalizedState = state[0].charAt(0).toUpperCase() + state[0].slice(1).toLowerCase();
        this._deviceState = state[0];
        if (this._stateLabel) {
            this._stateLabel.text = normalizedState;
        }
        return this._deviceState;
    }

    private setLabel(): void {
        const stateLabel = new St.Label({text: this.deviceState});
        this.actor.insert_child_at_index(stateLabel, 4);
    }

    public setMenuIcon(): void {
        const deviceState = this.deviceState;
        const iconStr =
            deviceState == "UNKNOWN"
                ? 'dialog-question-symbolic'
                : deviceState == "STOPPED"
                    ? 'media-playback-stop-symbolic'
                    : deviceState == "RUNNING"
                        ? 'media-playback-start-symbolic'
                        : 'dialog-error-symbolic';
        // @ts-ignore
        this.icon.gicon = Gio.icon_new_for_string(iconStr);
    }

    public addPresetMenuItem(presetPath: string, enableActions: boolean = false): PresetMenuItem {
        const key = presetPath;
        const presetName = GLib.path_get_basename(presetPath)

        const presetMenuItem = new PresetMenuItem(key, presetName, this._settings);
        presetMenuItem.connect('preset-start', (event: any, state) => {
            this.reloadState();
            log(`preset started: ${state}`);
            this._notifications.showNotification(
                `Activated ${presetName} on ${this.deviceName}`,
                `Started injecting Input Remapper preset ${presetName} on ${this.deviceName}.`,
                true,
                {
                    'Stop Injecting': () => {
                        this.stopInjectingForDevice(false);
                    },
                    'Open Input Remapper': () => {
                        openInputRemapperUi();
                    }
                }
            );
            if (this.deviceState.toUpperCase() == 'STARTING') {
                const timeout = runAfter(2, () => {
                    log('post-starting state refresh running');
                    this.reloadState();
                    return false;
                });
            }
        });
        this.menu.addMenuItem(presetMenuItem);
        return presetMenuItem;
    }

    public reloadState() {
        this.getDeviceState();
        this.setMenuIcon();
        if (this.deviceState == "RUNNING") {
            this._stopAction.show()
        } else {
            this._stopAction.hide();
        }
    }

    public stopInjectingForDevice(enableNotification: boolean = true) {
        this._proxy.proxy.stop_injectingSync(this.deviceName);
        this.reloadState();
        if (enableNotification) {
            this._notifications.showNotification(
                `Stopped remapping ${this.deviceName}`,
                `Stopped injecting Input Remapper presets on ${this.deviceName}.`,
                true,
                {
                    'Open Input Remapper': () => {
                        openInputRemapperUi();
                    }
                }
            );
        }
    }

    private addStopAction() {
        const numPresets = this.menu.numMenuItems;
        const stopSeparator = new PopupMenu.PopupSeparatorMenuItem();
        this._stopAction = new PopupMenu.PopupMenuItem('Stop');
        this._stopAction.connect('activate', () => {
            this.stopInjectingForDevice();
        });
        this._stopAction.connect('hide', () => {
            stopSeparator.hide();
        });
        this._stopAction.connect('show', () => {
            stopSeparator.show();
        });
        this.menu.addMenuItem(this._stopAction);
        this.menu.addMenuItem(stopSeparator);
        this._stopAction.hide();
    }
}

export class DevicesMenu extends PanelMenu.Button {
    private _menuLayout: St.BoxLayout;
    private _menu: ImplPopupMenu;
    private _presetMenuItems: { [key: string]: PresetMenuItem };
    private _menuStateChangeId: any;
    private _extension: InputRemapperExtension;
    private _settingChangedSignals: any[] = [];
    private _settings: Gio.Settings;
    private _devices: { [key: string]: DeviceSubMenu } = {};
    private _menuHeader?: PopupMenu.PopupSeparatorMenuItem;
    private _proxy: ProxyHandler;

    static {
        GObject.registerClass(this)
    }

    private setIcon() {
        const icon = new St.Icon({
            icon_name: 'input-keyboard-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(icon);
    }

    private getDaemonState(): boolean {
        try {
            const state = this._proxy.proxy.helloSync("gnome-input-remapper");
            return state[0] == "gnome-input-remapper";
        } catch (e) {
            return false;
        }
    }

    constructor(extension: InputRemapperExtension) {
        super(0.5, "Devices");
        this.setIcon();
        this._extension = extension;
        this._settings = extension.getSettings();
        this._proxy = new ProxyHandler(this._extension.settings);

        this._presetMenuItems = {};
        this._menu = this.menu as ImplPopupMenu;

        this._addSettingChangedSignal('enable-preset-actions', () => {});

        this._menuLayout = new St.BoxLayout({
            vertical: false,
            clip_to_allocation: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            x_expand: true
        });

        const disconnectEvent = () => {
            if (this._menuStateChangeId) {
                log(`disconnecting menu state change handler: ${this._menuStateChangeId}`);
                this._menu.disconnect(this._menuStateChangeId);
                this._menuStateChangeId = undefined;
            }
        }

        const watcher = getBusWatcher((conn, _, owner) => {
            //service is running
            log(`Input Remapper service is running as ${owner}`);
                disconnectEvent();
                this._menu.removeAll();
                this.initializeMenuEnabled();
        }, (conn, _) => {
            //service is not running
                log(`menu already configured, initializing disabled menu (${this._menuStateChangeId})`);
                disconnectEvent();
                this._menu.removeAll();
                //TODO: we need to reset the menu back to a disabled state
                this.addDisabledMenu();
        });

        const daemonState = this.getDaemonState();

        log(`daemon state: ${daemonState}, menu: ${this._menu.length}`);

        this._extension.settings.addValueWatch('current-config-dir', 'config-dir', value => {
            disconnectEvent();
            const state = this.getDaemonState();
            if (state) {
                this._menu.removeAll();
                this._devices = {};
                this._presetMenuItems = {};
                this.initializeMenuEnabled();
            }
            // if the daemon isn't running, the device list is already empty
            // and if the daemon starts, the handler will fire populate the menu with the updated config dir
        }, SettingsLoader.string(FileHelpers.getDefaultConfigPath()))


        // }
    }

    private initializeMenuEnabled() {
        this.initializeMenu();
        this.populateMenu();

        // @ts-ignore
        this._menuStateChangeId = this._menu.connect('open-state-changed', (self, isMenuOpen) => {
            if (isMenuOpen) {
                log('Input Remapper Menu opened!');
                this.refreshDeviceStates();
            }
        });
        log(`registered menu state change handler: ${this._menuStateChangeId}`);
    }

    private refreshDeviceStates() {
        for (const device of Object.entries(this._devices)) {
            device[1].reloadState();
        }
    }

    private addDisabledMenu() {
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Disabled"));
        const item = new PopupMenu.PopupMenuItem("Input Remapper is not running, or not installed!", {activate: false, reactive: false});
        this._menu.addMenuItem(item);
    }

    private initializeMenu() {
        this._menuHeader = new PopupMenu.PopupSeparatorMenuItem("Devices");
        // this._menuHeader.style_class = 'menu-item submenu-menu-item';
        const stopButton = getIconButton('media-playback-stop-symbolic');
        stopButton.connect('clicked', () => {
            this._proxy.proxy.stop_allSync();
            const notif = new NotificationManager(this._extension.settings);
            notif.showNotification(
                `Stopped all devices`,
                `Stopped injecting Input Remapper presets for all devices.`,
                true,
                {
                    'Open Input Remapper': () => {
                        openInputRemapperUi();
                    }
                }
            );
            runAfter(1, () => this.refreshDeviceStates());
            // this.refreshDeviceStates();
        });
        this._menuHeader.add_child(stopButton)
        this._menu.addMenuItem(this._menuHeader);

        this.addCommonMenuEntries();
    }

    private populateMenu() {
        var configs = new paths().getConfigFiles(this._proxy.currentConfigDir);
        for (const [device, presets] of Object.entries(configs)) {
            this.addDeviceMenu(device, 1);
            this.populateDeviceMenu(device, presets);
        }
    }

    private addCommonMenuEntries() {
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._menu.addAction("Open Config Directory", () => {
            // const path = FileHelpers.getConfigPath();
            paths.openDirectory(this._proxy.currentConfigDir);
        });

        (this.menu as ImplPopupMenu).addAction("Open Input Remapper", () => {
            openInputRemapperUi();
        });
    }

    private addDeviceMenu(device: string, position?: number) {
        this._devices[device] = new DeviceSubMenu(this._extension.settings, device);
        this._menu.addMenuItem(this._devices[device], position);
    }

    private populateDeviceMenu(groupName: string, groupPresets: string[]) {
        let enableActions = this._extension.getSettings().get_value('enable-preset-actions').deepUnpack() ?? false;
        let device = this._devices[groupName];
        if (!device) {
            log(`device menu not found for ${groupName}, creating new device menu`);
            this.addDeviceMenu(groupName);
        }

        for (const preset of groupPresets) {
            this._presetMenuItems[preset] = this._devices[groupName].addPresetMenuItem(preset, enableActions as boolean);
            // this.addPresetMenuItem(groupName, preset);
        }

        // this._menu.addMenuItem(this._groups[groupName]);
    }

    private _addSettingChangedSignal(key: string, callback: (...args: any[]) => any) {
        this._settingChangedSignals.push(this._settings.connect('changed::' + key, callback));
    }
}

export default class InputRemapperExtension extends Extension {
    private gsettings?: Gio.Settings
    button?: PanelMenu.Button
    private _indicator?: DevicesMenu;
    settings!: ExtensionSettings;

    enable() {
        // @ts-ignore
        this.gsettings = this.getSettings();
        this.settings = new ExtensionSettings(this.gsettings);

        this._indicator = new DevicesMenu(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

    }

    disable() {
        this._indicator?.destroy();
        this._indicator = undefined;
        this.gsettings = undefined;
    }
}