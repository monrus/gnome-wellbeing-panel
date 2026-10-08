# Wellbeing Panel

A GNOME Shell extension that shows today's screen time in the top panel,
backed by the built-in **Wellbeing / Screen Time** data.

> Status: working (v0.1.0). The panel reads today's screen time directly from
> GNOME's own Wellbeing data (same source as Settings → Wellbeing).

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

## Data source

The extension is read-only and uses GNOME's built-in screen time recording.
gnome-shell writes state transitions (active ↔ idle/locked/suspended) to:

```
~/.local/share/gnome-shell/session-active-history.json
```

This is the same file the Wellbeing panel in gnome-control-center reads, so the
value matches Settings → Wellbeing → Screen Time → Today.

Notes:

- It counts *active* session time (idle, lock and suspend are excluded). There
  is no per-application breakdown.
- Recording must be enabled (Settings → Wellbeing). When it is disabled,
  gnome-shell deletes the file and the panel shows a dash.
- The day boundary is local midnight. (gnome-shell's own daily-limit accounting
  resets at 03:00 to survive DST transitions; the value shown here follows the
  Wellbeing statistics, i.e. midnight.)
- The path/format is stable for GNOME 47–50; a future shell release could
  change it.

## Development

```sh
make build     # compile the GSettings schema
make test      # run the unit tests for the screen time logic (gjs)
make install   # install into the user profile
make pack      # build <uuid>.shell-extension.zip
make uninstall # remove
make clean
```

Layout:

```
extension.js           entry point: panel button, refresh loop
prefs.js               preferences window
src/usageReader.js     reads the gnome-shell history file
src/screenTime.js      pure parsing/summing logic (unit-tested)
src/formatTime.js      duration formatting
schemas/               GSettings schema
tests/                 gjs unit tests
```

## License

GPL-3.0-or-later. See `LICENSE`.
