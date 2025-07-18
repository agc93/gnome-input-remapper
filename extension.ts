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
import * as Util from 'resource:///org/gnome/shell/misc/util.js'
import {getIconButton, PresetMenuItem} from './components.js'
import * as DBus from './dbus.js';
import {getInputRemapperProxy} from "./dbus.js";
import {NotificationManager} from "./notifications.js";

type ImplPopupMenu =  PopupMenu.PopupMenu;

export class DeviceSubMenu extends PopupMenu.PopupSubMenuMenuItem {
    private _deviceState?: string;
    private _stopAction!: PopupMenu.PopupMenuItem;
    private _notifications: NotificationManager;
    private _stateLabel?: St.Label //GLib';
        ;
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
    constructor(directory: string, presets: string[]) {
        const dirName = GLib.path_get_basename(directory);
        super(dirName, true);

        this.deviceDirectory = directory;
        const titleItem = this.getHeader();
        this.menu.addMenuItem(titleItem);
        this.addStopAction();

        this.setMenuIcon();
        this._notifications = new NotificationManager();

    }

    private getHeader(): PopupMenu.PopupBaseMenuItem {
        const titleItem = new PopupMenu.PopupSeparatorMenuItem("State: ");
        this._stateLabel = new St.Label({text: this.deviceState});
        titleItem.actor.add_child(this._stateLabel);
        return titleItem;
    }

    private getDeviceState(): string {
        const proxy = getInputRemapperProxy()
        const state = proxy.get_stateSync(this.deviceName);
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

        const presetMenuItem = new PresetMenuItem(key, presetName, this.deviceName, enableActions as boolean);
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
        const proxy = getInputRemapperProxy();
        proxy.stop_injectingSync(this.deviceName);
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
    private _groups: {[key: string]: DeviceSubMenu};
    private _settingChangedSignals: any[] = [];
    private _settings: Gio.Settings;
    private _devices: { [key: string]: DeviceSubMenu } = {};
    private _menuHeader?: PopupMenu.PopupSeparatorMenuItem;

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


    constructor(extension: InputRemapperExtension) {
        super(0.5, "Devices");
        this.setIcon();
        this._extension = extension;
        this._settings = extension.getSettings();

        this._groups = {};
        this._presetMenuItems = {};
        this._menu = this.menu as ImplPopupMenu;

        this._addSettingChangedSignal('enable-preset-actions', () => {});

        this.initializeMenu();

        this._menuLayout = new St.BoxLayout({
            vertical: false,
            clip_to_allocation: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            x_expand: true
        });


        // this.addCommonMenuEntries();

        this.populateMenu();

        // @ts-ignore
        this._menuStateChangeId = this._menu.connect('open-state-changed', (self, isMenuOpen) => {
            if (isMenuOpen) {
                log('Input Remapper Menu opened!');
                this.refreshDeviceStates();
            }
        });


    }

    private refreshDeviceStates() {
        for (const device of Object.entries(this._devices)) {
            device[1].reloadState();
        }
    }

    private initializeMenu() {
        this._menuHeader = new PopupMenu.PopupSeparatorMenuItem("Devices");
        // this._menuHeader.style_class = 'menu-item submenu-menu-item';
        const stopButton = getIconButton('media-playback-stop-symbolic');
        stopButton.connect('clicked', () => {
            const proxy = getInputRemapperProxy();
            proxy.stop_allSync();
            const notif = new NotificationManager();
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
        var configs = new paths().getConfigFiles();
        for (const [device, presets] of Object.entries(configs)) {
            this.addDeviceMenu(device, 1);
            this.addMenuForDevice(device, presets);
        }
    }

    private addCommonMenuEntries() {
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._menu.addAction("Open Config Directory", () => {
            const path = FileHelpers.getConfigPath();
            paths.openDirectory(path);
        });

        (this.menu as ImplPopupMenu).addAction("Open Input Remapper", () => {
            openInputRemapperUi();
        });
    }

    private addDeviceMenu(device: string, position?: number) {
        this._devices[device] = new DeviceSubMenu(device, []);
        this._menu.addMenuItem(this._devices[device], position);
    }

    private addMenuForDevice(groupName: string, groupPresets: string[]) {
        let enableActions = this._extension.getSettings().get_value('enable-preset-actions').deepUnpack() ?? false;
        let device = this._devices[groupName];
        if (!device) {
            this._devices[groupName] = new DeviceSubMenu(groupName, groupPresets);
        }

        for (const preset of groupPresets) {
            const presetMenuItem = this._devices[groupName].addPresetMenuItem(preset, enableActions as boolean);
            this._presetMenuItems[preset] = presetMenuItem;
            // this.addPresetMenuItem(groupName, preset);
        }

        // this._menu.addMenuItem(this._groups[groupName]);
    }

    /** @deprecated **/
    private addPresetMenuItem(device: string, presetPath: string) {
        const key = presetPath;
        const presetName = GLib.path_get_basename(presetPath)
        let enableActions = this._extension.getSettings().get_value('enable-preset-actions').deepUnpack() ?? false;
        const presetMenuItem = new PresetMenuItem(key, presetName, device, enableActions as boolean);
        this._presetMenuItems[key] = presetMenuItem;
        this._groups[device].menu.addMenuItem(presetMenuItem);
    }

    private _addSettingChangedSignal(key: string, callback: (...args: any[]) => any) {
        this._settingChangedSignals.push(this._settings.connect('changed::' + key, callback));
    }
}

export default class InputRemapperExtension extends Extension {
    gsettings?: Gio.Settings
    animationsEnabled: boolean = true
    button?: PanelMenu.Button
    private _indicator?: DevicesMenu;

    enable() {
        // @ts-ignore
        this.gsettings = this.getSettings();
        this.animationsEnabled = this.gsettings!.get_value('padding-inner').deepUnpack() ?? 8

        this._indicator = new DevicesMenu(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

    }



    disable() {
        this._indicator?.destroy();
        this._indicator = undefined;
        this.gsettings = undefined;
    }




}