# Input Remapper Control for GNOME

A lightweight extension to quickly activate and stop Input Remapper presets from your GNOME top bar.

> For the extension's functionality to fully work, you'll need [Input Remapper](https://github.com/sezanzeb/input-remapper) already installed and set up.

## Documentation

You can see the [full docs here on GitHub](https://agc93.github.io/gnome-input-remapper/).

## Building the extension

If you want to build it yourself, you should be able to just clone this repository, and run `make`.

To test the extension locally:

```bash
# this will compile the extension and extract it to your home directory
make install
# now run a nested wayland session
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x720
dbus-run-session -- gnome-shell --nested --wayland
```

> If the extension isn't already active in the nested session, open a terminal inside the session and run `gnome-extensions enable gnome-input-remapper@agc93.dev`