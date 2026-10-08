# Wellbeing Panel — сборка и установка GNOME Shell расширения.
#
# Используем .RECIPEPREFIX, чтобы не зависеть от символов табуляции.
.RECIPEPREFIX := >

UUID := wellbeing-panel@monrus
SCHEMA_NAME := org.gnome.shell.extensions.wellbeing-panel
SCHEMA_DIR := schemas
SCHEMA_XML := $(SCHEMA_DIR)/$(SCHEMA_NAME).gschema.xml
SCHEMA_COMPILED := $(SCHEMA_DIR)/gschemas.compiled

EXTENSION_ROOT := $(HOME)/.local/share/gnome-shell/extensions
EXTENSION_DIR := $(EXTENSION_ROOT)/$(UUID)

# Что попадает в поставку расширения.
SOURCES := metadata.json extension.js prefs.js stylesheet.css src

.PHONY: all build schemas install uninstall enable disable pack clean

all: build

build: schemas

schemas:
> glib-compile-schemas --strict $(SCHEMA_DIR)

install: build
> rm -rf $(EXTENSION_DIR)
> mkdir -p $(EXTENSION_DIR)/schemas
> cp -r $(SOURCES) $(EXTENSION_DIR)/
> cp $(SCHEMA_XML) $(SCHEMA_COMPILED) $(EXTENSION_DIR)/schemas/
> @echo "Установлено в $(EXTENSION_DIR)"
> @echo "Включите (и перелогиньтесь на Wayland): make enable"

enable:
> gnome-extensions enable $(UUID)

disable:
> gnome-extensions disable $(UUID)

uninstall:
> -gnome-extensions uninstall $(UUID)
> rm -rf $(EXTENSION_DIR)

pack: build
> @tmp=$$(mktemp -d); \
> mkdir -p $$tmp/$(UUID)/schemas; \
> cp -r $(SOURCES) $$tmp/$(UUID)/; \
> cp $(SCHEMA_XML) $(SCHEMA_COMPILED) $$tmp/$(UUID)/schemas/; \
> (cd $$tmp && zip -qr $(CURDIR)/$(UUID).shell-extension.zip $(UUID)); \
> rm -rf $$tmp; \
> echo "Собрано: $(UUID).shell-extension.zip"

clean:
> rm -f $(SCHEMA_COMPILED) $(UUID).shell-extension.zip
