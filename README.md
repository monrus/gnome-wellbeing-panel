# Wellbeing Panel

A GNOME Shell extension that shows today's screen time in the top panel,
backed by the built-in **Wellbeing / Screen Time** data.

> Status: scaffold (v0.1.0). Reading the data is not implemented yet — it is
> currently a stub (see `src/usageReader.js`). The next step is to determine
> where the built-in Wellbeing gets its data and wire it up.

## What it does

- A panel button (left of the clock) with today's total screen time.
- Click — a popup with the status and quick links to the settings.
- Settings: show the value as text or an icon only; refresh interval.

## Requirements

- GNOME Shell 47–50 (target: 50), Wayland or X11.
- `glib-compile-schemas` (package `libglib2.0-bin`) and `zip` — for building.

## Installation

```sh
make install   # build the schema and copy into ~/.local/share/gnome-shell/extensions/<uuid>
make enable    # enable the extension
```

On Wayland a **logout/login** is required after the first install
(GNOME Shell cannot be restarted in place).

## Development

```sh
make build     # compile the GSettings schema
make install   # install into the user profile
make pack      # build <uuid>.shell-extension.zip
make uninstall # remove
make clean
```

Layout:

```
extension.js           entry point: panel button, refresh loop
prefs.js               preferences window
src/usageReader.js     screen-time data source (stub)
src/formatTime.js      duration formatting
schemas/               GSettings schema
```

## License

GPL-3.0-or-later. See `LICENSE`.
