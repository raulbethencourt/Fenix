local mark = require("harpoon.mark")
local ui = require("harpoon.ui")

lvim.builtin.which_key.mappings["q"] = {
	name = "Harpoon",
	s = { mark.add_file, "Add file" },
	d = { ui.toggle_quick_menu, "Menu" },
	j = {
		function()
			ui.nav_file(1)
		end,
		"File 1",
	},
	k = {
		function()
			ui.nav_file(2)
		end,
		"File 2",
	},
	l = {
		function()
			ui.nav_file(3)
		end,
		"File 3",
	},
	m = {
		function()
			ui.nav_file(4)
		end,
		"File 4",
	},
}
