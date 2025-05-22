local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- Font
config.font_size = 11
config.font = wezterm.font { family = 'CaskaydiaCove Nerd Font' }
config.font_rules = {
  {
    intensity = 'Bold',
    italic = true,
    font = wezterm.font {
      family = 'Victor Mono',
      weight = 'Bold',
      style = 'Italic',
    },
  },
  {
    italic = true,
    intensity = 'Half',
    font = wezterm.font {
      family = 'Victor Mono',
      weight = 'DemiBold',
      style = 'Italic',
    },
  },
  {
    italic = true,
    intensity = 'Normal',
    font = wezterm.font {
      family = 'Victor Mono',
      style = 'Italic',
    },
  },
}

-- Colors
config.color_scheme = 'Gruvbox Material (Gogh)'
config.colors = {
  background = '#000000',
}

-- Window
config.window_background_opacity = 0.98
config.enable_tab_bar = false

-- Exec
config.default_prog = { '/home/rabeta/.nix-profile/bin/tmux' }

return config
