#!/bin/sh

activeWindow=$(hyprctl activewindow -j | jq -r '.class') # -r strips quotes

shiftPasteClasses=(
    Alacritty
)

echo "Active window class: $activeWindow"

contains_element() {
  local e
  for e in "${@:2}"; do [[ "$e" == "$1" ]] && return 0; done
  return 1
}

if contains_element "$activeWindow" "${shiftPasteClasses[@]}"; then
    hyprctl dispatch sendshortcut "CTRL SHIFT,V,"
else
    hyprctl dispatch sendshortcut "CTRL,V,"
fi
