---
weight: 20
title: "Installation"
---

# Installation

## Installing Input Remapper for GNOME

{{% hint info %}}
The extension isn't available on the GNOME Extensions site yet, so we'll cover the steps to manually install it.
{{% /hint %}}

Getting this extension set up and ready shouldn't take more than a few minutes! Follow the steps below:

### 1. Make sure Input Remapper is ready

Once you've installed Input Remapper, launch the UI to make sure it runs and detects your peripherals

### 2. Configure your presets

The plugin just lets you control your presets, so you'll still need to set them up. While you can create them manually, your best bet is to use the Input Remapper desktop app (`input-remapper-gtk`) like usual. You can create as many presets for as many devices as you want.

### 3. Install the extension

#### Install from File

1. Download the [`gnome-input-remapper.zip`](https://github.com/agc93/gnome-input-remapper/releases/latest/download/gnome-input-remapper.zip) file from the [latest release](https://github.com/agc93/gnome-input-remapper/releases/latest) on GitHub.
1. Open a terminal, change to the directory containing the downloaded ZIP file
1. Run `gnome-extensions install gnome-input-remapper.zip`
1. Log out and log back in, or restart your PC

### 4. Enable the extension

If the extension isn't already enabled when you log back in, open the GNOME Extensions app and enable it.

> You can also run `gnome-extensions enable gnome-input-remapper@agc93.dev` from a terminal.

### 5. Open the new menu

You should have a new menu in the top bar with a keyboard icon! Click the icon to open the new menu.

There's more information on [using the extension here](./usage.md).