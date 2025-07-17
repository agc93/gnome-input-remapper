import GObject from "gi://GObject";
import St from "gi://St";
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import Gio from "gi://Gio";
import * as DBus from './dbus.js';
import {getInputRemapperProxy} from "./dbus.js";
import FileHelpers from "./utils.js";

export class PresetMenuItem extends PopupMenu.PopupBaseMenuItem {
    private _running: boolean;
    private readonly _key: string;
    private readonly _labelEl: St.Label;
    private _proxy: (DBus.InputRemapperDbusApi & Gio.DBusProxy) | null = null;
    static {
        GObject.registerClass({Signals: {
                'preset-start': { param_types: [Clutter.Event.$gtype] },
            }}, PresetMenuItem);
    }

    get presetName(): string {
        return GLib.path_get_basename(this._key).replace('.json', '');
    }

    get deviceName(): string {
        return GLib.path_get_basename(GLib.path_get_dirname(this._key));
    }

    constructor(key: string, label: string, value: string, enableActions: boolean = false) {
        super({style_class: 'preset-menu-item'});
        this._running = false;
        this._updateOrnament();
        log(`creating preset menu item: ${key}`)

        this._key = key;
        this._labelEl = new St.Label({
            text: this.presetName, x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._labelEl);
        if (enableActions) {
            this._addEditAction();
            this._addStartAction();
        }
    }

    private _addEditAction() {
        let ejectIcon = new St.Icon({
            icon_name: 'text-editor-symbolic',
            style_class: 'popup-menu-icon',
        });
        let ejectButton = new St.Button({
            child: ejectIcon,
            style_class: 'button pi-action-btn',
        });
        ejectButton.connect('clicked', () => {
            FileHelpers.openDirectory(this._key);
        });
        this.add_child(ejectButton);

    }

    private _addStartAction() {
        let ejectIcon = new St.Icon({
            icon_name: 'media-playback-start-symbolic',
            style_class: 'popup-menu-icon',
        });
        let ejectButton = new St.Button({
            child: ejectIcon,
            style_class: 'button',
        });
        ejectButton.connect('clicked', () => {
            this.startPreset(null);
        });
        this.add_child(ejectButton);
    }

    private _updateOrnament() {
        if (this._running) {
            this.setOrnament(PopupMenu.Ornament.CHECK);
        } else {
            this.setOrnament(PopupMenu.Ornament.NONE);
        }
    }

    activate(event: Clutter.Event) {
        // super.activate(event);
        this.startPreset(event);
    }

    startPreset(event?: any) {
        try {
            this._proxy = getInputRemapperProxy();
            const result = this._proxy.start_injectingSync(this.deviceName, this.presetName);
            log(`got response: ${result}`);
            const state = this._proxy.get_stateSync(this.deviceName);
            log(`got device state: ${state}`);
            const presetStarted = result && (state.includes('RUNNING') || state.includes('STARTING'));
            this.setActive(presetStarted);
            if (presetStarted) this.emit('preset-start', event);
        } catch (e) {
            logError(e);
        }
    }

    setActive(active: boolean) {
        this._running = active;
        this._updateOrnament();
    }
}