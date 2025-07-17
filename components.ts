import GObject from "gi://GObject";
import St from "gi://St";
import GLib from 'gi://GLib';
import type Clutter from '@girs/clutter-16';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import Gio from "gi://Gio";
import * as DBus from './dbus.js';
import {getInputRemapperProxy} from "./dbus.js";

export class PresetMenuItem extends PopupMenu.PopupBaseMenuItem {
    private _running: boolean;
    private readonly _key: string;
    private readonly _labelEl: St.Label;
    private _proxy: (DBus.InputRemapperDbusApi & Gio.DBusProxy) | null = null;
    static {
        GObject.registerClass(this)
    }

    get presetName(): string {
        return GLib.path_get_basename(this._key).replace('.json', '');
    }

    get deviceName(): string {
        return GLib.path_get_basename(GLib.path_get_dirname(this._key));
    }

    constructor(key: string, label: string, value: string) {
        super();
        this._running = false;
        this._updateOrnament();
        log(`creating preset menu item: ${key}`)

        this._key = key;
        this._labelEl = new St.Label({text: this.presetName});
        this.add_child(this._labelEl);


    }

    private _updateOrnament() {
        if (this._running) {
            this.setOrnament(PopupMenu.Ornament.CHECK);
        } else {
            this.setOrnament(PopupMenu.Ornament.NONE);
        }
    }

    activate(event: Clutter.Event) {
        super.activate(event);
        try {
            this._proxy = getInputRemapperProxy();
            const result = this._proxy.start_injectingSync(this.deviceName, this.presetName);
            log(`got response: ${result}`);
            const state = this._proxy.get_stateSync(this.deviceName);
            log(`got device state: ${state}`);
            this.setActive(result && (state.includes('RUNNING') || state.includes('STARTING')));
        } catch (e) {
            logError(e);
        }

    }

    setActive(active: boolean) {
        this._running = active;
        this._updateOrnament();
    }
}