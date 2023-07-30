local wezterm = require("wezterm")

local c = {}

if wezterm.config_builder then
	c = wezterm.config_builder()
end

c.font_size = 10.0
c.line_height = 1.05
c.color_scheme = "Gruvbox dark, hard (base16)"
c.font = wezterm.font({ family = "CaskaydiaCove Nerd Font" })
c.font_rules = {
	{
		italic = true,
		intensity = "Bold",
		font = wezterm.font({
			family = "VictorMono",
			weight = "Bold",
			style = "Italic",
		}),
	},
	{
		italic = true,
		intensity = "Half",
		font = wezterm.font({
			family = "VictorMono",
			weight = "DemiBold",
			style = "Italic",
		}),
	},
	{
		italic = true,
		intensity = "Normal",
		font = wezterm.font({
			family = "VictorMono",
			style = "Italic",
		}),
	},
}

c.window_decorations = "RESIZE"
c.enable_tab_bar = false
c.hide_mouse_cursor_when_typing = true
c.default_cursor_style = "BlinkingBlock"
c.cursor_blink_rate = 700
c.default_prog = { "/usr/bin/tmux" }

return c
