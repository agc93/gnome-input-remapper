import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import {ExtensionSettings} from "./settings.js";

/**
 * Manages notifications for script execution
 */
export class NotificationManager {
    private _notificationSource: any = null;
    private _settings: ExtensionSettings;

    constructor(settings: ExtensionSettings) {
        this._notificationSource = null;
        this._settings = settings;
    }

    /**
     * Show a notification with the given title, body, and success status
     *
     * @param title - Notification title
     * @param body - Notification body
     * @param success - Whether the operation was successful
     * @param actions
     */
    showNotification(title: string, body: string, success: boolean|string, actions: {
        [label: string]: () => void
    } = {}): void {
        // Use different icons for success/failure

        const iconName = typeof success === 'string' ? success : (success ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic');

        // Create the notification source if needed
        if (!this._notificationSource) {
            this.initializeNotificationSource();
        }

        if (this._settings.notificationsEnabled) {

            // Create notification with object-based API
            // Use type assertion to work around type checking issues
            const notification = new MessageTray.Notification({
                source: this._notificationSource,
                title: title,
                body: body,
                iconName: iconName
            });


            if (Object.keys(actions).length > 0) {
                for (const [label, callback] of Object.entries(actions)) {
                    notification.addAction(label, callback);
                }
            }

            // Add notification to the source
            this._notificationSource.addNotification(notification);
        }
    }

    private initializeNotificationSource() {
        // Create source with object-based API
        // Use type assertion to work around type checking issues
        this._notificationSource = new MessageTray.Source({
            title: _('Input Remapper'),
            iconName: 'input-keyboard-symbolic'
        });

        this._notificationSource.connect('destroy', () => {
            this._notificationSource = null;
        });

        // Add the source to the message tray
        Main.messageTray.add(this._notificationSource);
    }

    /**
     * Show a success notification
     *
     * @param scriptName - Name of the script
     * @param message - Optional message (defaults to "Script executed successfully")
     */
    showSuccess(scriptName: string, message: string | null = null): void {
        this.showNotification(scriptName, message || _('Script executed successfully'), true);
    }

    /**
     * Show an error notification
     *
     * @param scriptName - Name of the script
     * @param error - Error message or Error object
     */
    showError(scriptName: string, error: string | Error): void {
        const errorMessage = error instanceof Error ? error.message : error;
        this.showNotification(scriptName, errorMessage, false);
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this._notificationSource = null;
    }
}