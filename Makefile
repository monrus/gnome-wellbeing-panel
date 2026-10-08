# Wellbeing Panel — build and install for the GNOME Shell extension.
#
# We use .RECIPEPREFIX so the recipes do not depend on tab characters.
.RECIPEPREFIX := >

UUID := wellbeing-panel@monrus
SCHEMA_NAME := org.gnome.shell.extensions.wellbeing-panel
SCHEMA_DIR := schemas
SCHEMA_XML := $(SCHEMA_DIR)/$(SCHEMA_NAME).gschema.xml
SCHEMA_COMPILED := $(SCHEMA_DIR)/gschemas.compiled

EXTENSION_ROOT := $(HOME)/.local/share/gnome-shell/extensions
EXTENSION_DIR := $(EXTENSION_ROOT)/$(UUID)

# What goes into the extension package.
SOURCES := metadata.json extension.js prefs.js stylesheet.css src

# i18n (gettext)
DOMAIN := wellbeing-panel
PO_DIR := po
LOCALE_DIR := locale
POT := $(PO_DIR)/$(DOMAIN).pot
LINGUAS := $(patsubst $(PO_DIR)/%.po,%,$(wildcard $(PO_DIR)/*.po))
TRANSLATABLE := extension.js prefs.js src/formatTime.js

.PHONY: all build schemas test pot update-po translations install uninstall enable disable pack clean

all: build

build: schemas

schemas:
> glib-compile-schemas --strict $(SCHEMA_DIR)

test:
> @for t in tests/*.test.js; do echo "== $$t"; gjs -m "$$t" || exit 1; done

# Extract strings into the .pot (requires xgettext from the gettext package).
pot:
> xgettext --from-code=UTF-8 --output=$(POT) --package-name="Wellbeing Panel" \
>   --keyword=_ --keyword=N_ --keyword=ngettext:1,2 --keyword=pgettext:1c,2 \
>   $(TRANSLATABLE)

# Merge new strings from the .pot into the existing translations.
update-po: pot
> @for l in $(LINGUAS); do \
>   msgmerge --update --backup=none $(PO_DIR)/$$l.po $(POT); \
> done

# Compile translations into locale/<lang>/LC_MESSAGES/<domain>.mo (needs msgfmt).
# Optional: if msgfmt (gettext) is missing, warn and continue with English only.
translations:
> @if [ -n "$(LINGUAS)" ]; then \
>   if command -v msgfmt >/dev/null 2>&1; then \
>     for l in $(LINGUAS); do \
>       mkdir -p $(LOCALE_DIR)/$$l/LC_MESSAGES; \
>       msgfmt -c -o $(LOCALE_DIR)/$$l/LC_MESSAGES/$(DOMAIN).mo $(PO_DIR)/$$l.po || exit 1; \
>     done; \
>   else \
>     echo "msgfmt not found (install gettext); skipping translations"; \
>   fi; \
> fi

install: build translations
> rm -rf $(EXTENSION_DIR)
> mkdir -p $(EXTENSION_DIR)/schemas
> cp -r $(SOURCES) $(EXTENSION_DIR)/
> cp $(SCHEMA_XML) $(SCHEMA_COMPILED) $(EXTENSION_DIR)/schemas/
> @if [ -d $(LOCALE_DIR) ]; then cp -r $(LOCALE_DIR) $(EXTENSION_DIR)/; fi
> @echo "Installed to $(EXTENSION_DIR)"
> @echo "Enable it (and log out/in on Wayland): make enable"

enable:
> gnome-extensions enable $(UUID)

disable:
> gnome-extensions disable $(UUID)

uninstall:
> -gnome-extensions uninstall $(UUID)
> rm -rf $(EXTENSION_DIR)

pack: build translations
> @tmp=$$(mktemp -d); \
> mkdir -p $$tmp/$(UUID)/schemas; \
> cp -r $(SOURCES) $$tmp/$(UUID)/; \
> cp $(SCHEMA_XML) $(SCHEMA_COMPILED) $$tmp/$(UUID)/schemas/; \
> if [ -d $(LOCALE_DIR) ]; then cp -r $(LOCALE_DIR) $$tmp/$(UUID)/; fi; \
> (cd $$tmp && zip -qr $(CURDIR)/$(UUID).shell-extension.zip $(UUID)); \
> rm -rf $$tmp; \
> echo "Built: $(UUID).shell-extension.zip"

clean:
> rm -f $(SCHEMA_COMPILED) $(UUID).shell-extension.zip
> rm -rf $(LOCALE_DIR)
