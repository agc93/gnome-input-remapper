import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {default as paths} from './utils.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js'
type ImplPopupMenu =  PopupMenu.PopupMenu<PopupMenu.PopupMenu.SignalMap>;
import {PopupSubMenuMenuItem} from "@girs/gnome-shell/ui/popupMenu";

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
        Gio.app_info_launch_default_for_uri(this.deviceDirectory, null)
    }

    override activate(event: Clutter.Event) {
        this.onOpenDeviceDirectory();
        super.activate(event);
    }
}

export class DevicesMenu extends PanelMenu.Button {

    static {
        GObject.registerClass(this)
    }

    private _devices: any[];
    constructor() {
        super(0.5, "Devices");
        this.setIcon();

        this._devices = [];

        const configFiles = new paths().getConfigFiles();
        for (const [directory, files] of Object.entries(configFiles)) {

            this.addDevice(directory, files);

        }

        const menu = this.menu as ImplPopupMenu;

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction("Open Config Directory", () => {
            const path = new paths().getConfigPath();
            Gio.app_info_launch_default_for_uri(path, null);
        });

        (this.menu as ImplPopupMenu).addAction("Open Input Remapper", () => {
            // @ts-ignore
            Util.spawn(["input-remapper-gtk"]);
        });

        this.updateMenuVisibility();

    }

    private setIcon() {
        const icon = new St.Icon({
            icon_name: 'input-keyboard-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(icon);
    }

    private updateMenuVisibility() {
        // if (this._devices.filter(device => device.visible).length > 0) {
        //     this.show();
        // } else {
        //     this.hide();
        // }
        this.show();
    }

    private addDevice(devicePath: string, devicePresets: string[]) {
        let item = new DeviceMenuItem(devicePath, devicePresets);
        this._devices.unshift(item);
        // @ts-ignore
        this.menu.addMenuItem(item);
        item.connect('notify::visible', () => this.updateMenuVisibility());
    }



    populateMenu(menu: PopupMenu.PopupMenu<PopupMenu.PopupMenu.SignalMap>) {
        const configFiles = new paths().getConfigFiles();
        for (const [directory, files] of Object.entries(configFiles)) {
            const dirName = GLib.path_get_basename(directory);
            const dirItem = new PopupMenu.PopupSubMenuMenuItem(dirName);

            for (const file of files) {
                const fileName = GLib.path_get_basename(file);
                const fileItem = new PopupMenu.PopupMenuItem(fileName);
                dirItem.menu.addMenuItem(fileItem);
            }

            menu.addMenuItem(dirItem);
        }
    }


}

export default class InputRemapperMenu extends Extension {
    gsettings?: Gio.Settings
    animationsEnabled: boolean = true
    button?: PanelMenu.Button
    private _indicator?: DevicesMenu;

    enable() {
        this.gsettings = this.getSettings();
        this.animationsEnabled = this.gsettings!.get_value('padding-inner').deepUnpack() ?? 8

        this._indicator = new DevicesMenu();
        Main.panel.addToStatusArea(this.uuid, this._indicator);

    }



    disable() {
        this._indicator?.destroy();
        this._indicator = undefined;
        this.gsettings = undefined;
    }




}