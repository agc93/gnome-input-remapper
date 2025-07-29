---
weight: 30
title: "Usage"
---

# Using Input Remapper for GNOME

Once you've [installed and enabled](./installation.md) the extension, you'll have a new button in your GNOME top panel, with a keyboard icon.

Click the icon to open the menu. The menu will list any devices with configured presets, and if you click any device it will list all presets for that device. Click the preset name and the extension will tell Input Remapper to start injecting keystrokes for the device according to the preset.

> Due to how Input Remapper works <sup>[for now](https://github.com/sezanzeb/input-remapper/issues/1132)</sup>, there might be a couple of seconds delay between clicking the menu entry and the preset being applied.

The icon beside each device in the menu indicates if a preset is currently running or not:
- ❔: Unknown state, this generally means Input Remapper hasn't been started for the device
- ⏹️: Stopped. Input Remapper is not currently mapping the device.
- ▶️: Running. Input Remapper is injecting keystrokes for this device.

If there is a preset running for the device, you'll see an extra *Stop* menu item that will stop injecting keystrokes for that device. You can also click the ⏹️ button at the top of the menu to stop injecting keystrokes for all devices at once.

# Configuration

While the extension will work out-of-the-box for most users, there are a couple of extra options you may want/need to change:

## Opening extension preferences

You can open the extension settings by finding *Input Remapper Control* in the GNOME Extensions app, click the three dots and click *Settings*.

## Options

### Configuration Directory Path

If you have multiple Input Remapper installs, or you use a custom configuration directory, you can set the path to use here.

The extension will use this directory to list presets, and will automatically configure Input Remapper to use this directory when starting and stopping device presets.

### Preset Actions (Interface)

This option is for advanced users who want to manually edit your device presets. If you enable this option, the menu will add quick actions to each preset to quickly open the preset file itself with the default application.

### Enable Notifications (Interface)

By default, the extension will send notifications whenever presets are started or stopped from the menu. If you'd prefer not to get these, just toggle this option to disable them entirely.
