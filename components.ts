import GObject from "gi://GObject";
import St from "gi://St";
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import {ProxyHandler} from "./dbus.js";
import FileHelpers from "./utils.js";
import {ExtensionSettings, SettingsLoader} from "./settings.js";

export function getIconButton(icon: string, buttonClasses: string[] = [], iconClasses: string[] = []) {
    const classes = ['button', 'action-btn', ...buttonClasses];
    iconClasses = ['popup-menu-icon', ...iconClasses];
    let ejectIcon = new St.Icon({
        icon_name: icon,
        style_class: iconClasses.join(' '),
    });
    return new St.Button({
        child: ejectIcon,
        style_class: classes.join(' '),
    });
}

export class PresetMenuItem extends PopupMenu.PopupBaseMenuItem {
    private readonly _key: string;
    private readonly _labelEl: St.Label;
    private _proxy: ProxyHandler;
    private readonly _editButton: St.Button;
    private readonly _startButton: St.Button;
    static {
        GObject.registerClass({Signals: {
                'preset-start': { param_types: [Clutter.Event.$gtype, GObject.TYPE_STRING] },
            }}, PresetMenuItem);
    }

    get presetName(): string {
        return GLib.path_get_basename(this._key).replace('.json', '');
    }

    get deviceName(): string {
        return GLib.path_get_basename(GLib.path_get_dirname(this._key));
    }

    constructor(key: string, label: string, settings: ExtensionSettings) {
        super({style_class: 'menu-item preset-menu-item'});
        // log(`creating preset menu item: ${key}`);

        this._proxy = new ProxyHandler(settings);

        this._key = key;
        this._labelEl = new St.Label({
            text: this.presetName, x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._labelEl);

        this._editButton = getIconButton('text-editor-symbolic', ['pi-action-btn']);
        this._editButton.connect('clicked', () => {
            FileHelpers.openDirectory(this._key);
        });
        this._startButton = getIconButton('media-playback-start-symbolic', ['pi-action-btn']);
        this._startButton.connect('clicked', () => {
            this.startPreset(null);
        });



        if (settings.presetActionsEnabled) {
            this.add_child(this._editButton);
            this.add_child(this._startButton);
        }
        settings.addValueWatch(key, 'enable-preset-actions', async (value) => {
            if (value && !this.get_children().includes(this._editButton)) {
                // menu is not populated, but settings want it populated
                this.add_child(this._editButton);
                this.add_child(this._startButton);
            } else if (!value && this.get_children().includes(this._editButton)) {
                this.remove_child(this._editButton);
                this.remove_child(this._startButton);
            }
        }, SettingsLoader.boolean(false))
    }

    activate(event: Clutter.Event) {
        // super.activate(event);
        this.startPreset(event);
    }

    startPreset(event?: any) {
        try {
            const result = this._proxy.proxy.start_injectingSync(this.deviceName, this.presetName);
            // log(`got response: ${result}`);
            const state = this._proxy.proxy.get_stateSync(this.deviceName);
            // log(`got device state: ${state}`);
            const presetStarted = result && (state.includes('RUNNING') || state.includes('STARTING'));
            if (presetStarted) this.emit('preset-start', event, state[0]);
        } catch (e) {
            logError(e);
        }
    }
}