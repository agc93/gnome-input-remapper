import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import FileHelpers, {default as paths} from './utils.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js'
import {PresetMenuItem} from './components.js'
import * as DBus from './dbus.js';
import {getInputRemapperProxy} from "./dbus.js";

type ImplPopupMenu =  PopupMenu.PopupMenu;

export class DeviceSubMenu extends PopupMenu.PopupSubMenuMenuItem {
    private _deviceState?: string;
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
        this.setMenuIcon();

    }

    private getHeader(): PopupMenu.PopupBaseMenuItem {
        const titleItem = new PopupMenu.PopupSeparatorMenuItem("State: ");
        const labelEl = new St.Label({text: this.deviceState});
        titleItem.actor.add_child(labelEl);
        return titleItem;
    }

    private getDeviceState(): string {
        const proxy = getInputRemapperProxy()
        const state = proxy.get_stateSync(this.deviceName);
        log(`got device state: ${state}`, state);
        console.warn(state);
        this._deviceState = state[0];
        return this._deviceState;
    }

    private setLabel(): void {
        const stateLabel = new St.Label({text: this.deviceState});
        this.actor.insert_child_at_index(stateLabel, 4);
    }

    private setMenuIcon(): void {
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
}


/** @deprecated **/
export class DeviceMenuItem extends PopupMenu.PopupBaseMenuItem {
    static {
        GObject.registerClass(this)
    }

    private label: St.Label;
    private deviceDirectory: any;
    constructor(directory: any, presets: any[]) {
        super();
        this.deviceDirectory = directory;
        const dirName = GLib.path_get_basename(directory);
        this.label = new St.Label({
            text: dirName,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this.label);
        this.label_actor = this.label;
        // this.connect('activate', () => this.onOpenDeviceDirectory());
    }

    private onOpenDeviceDirectory() {
        paths.openDirectory(this.deviceDirectory);
    }

    override activate(event: Clutter.Event) {
        this.onOpenDeviceDirectory();
        super.activate(event);
    }
}

export class DevicesMenu extends PanelMenu.Button {
    private _menuLayout: St.BoxLayout;
    private _menu: ImplPopupMenu;
    private _presetMenuItems: { [key: string]: PresetMenuItem };
    private _menuStateChangeId: any;
    private _extension: InputRemapperExtension;
    private _groups: {[key: string]: DeviceSubMenu};

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

        this._groups = {};
        this._presetMenuItems = {};
        this._menu = this.menu as ImplPopupMenu;
        const menu = this.menu as ImplPopupMenu;

        const configFiles = new paths().getConfigFiles();

        for (const [directory, files] of Object.entries(configFiles)) {

            this.addMenuForDevice(directory, files);

        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._menuLayout = new St.BoxLayout({
            vertical: false,
            clip_to_allocation: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            x_expand: true
        });


        this.addCommonMenuEntries();


    }

    private addCommonMenuEntries() {
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._menu.addAction("Open Config Directory", () => {
            const path = FileHelpers.getConfigPath();
            paths.openDirectory(path);
        });

        (this.menu as ImplPopupMenu).addAction("Open Input Remapper", () => {
            // @ts-ignore
            Util.spawn(["input-remapper-gtk"]);
        });
    }

    // private addEvents():void {
    //     this._menuStateChangeId = this._menu.connect('open-state-changed', (self, isMenuOpen) => {
    //     if (isMenuOpen) {
    //         // make sure timer fires at next full interval
    //         this._updateTimeChanged();
    //
    //         // refresh sensors now
    //         this._querySensors();
    //     }
    // });
    // }



    private addMenuForDevice(groupName: string, groupPresets: string[]) {
        this._groups[groupName] = new DeviceSubMenu(groupName, groupPresets);

        for (const preset of groupPresets) {
            this.addPresetMenuItem(groupName, preset);
        }

        this._menu.addMenuItem(this._groups[groupName]);
    }

    private addPresetMenuItem(device: string, presetPath: string) {
        const key = presetPath;
        const presetName = GLib.path_get_basename(presetPath)
        let enableActions = this._extension.getSettings().get_value('enable-preset-actions').deepUnpack() ?? false;
        const presetMenuItem = new PresetMenuItem(key, presetName, device, enableActions as boolean);
        this._presetMenuItems[key] = presetMenuItem;
        this._groups[device].menu.addMenuItem(presetMenuItem);
    }

    private addPresetFolderMenuItem(presetDirectory: string, presetName: string) {

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