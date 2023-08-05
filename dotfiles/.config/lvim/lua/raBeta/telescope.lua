lvim.builtin.telescope.defaults.file_ignore_patterns = {
	".git/",
	"target/",
	"docs/",
	"vendor/*",
	"%.lock",
	"__pycache__/*",
	"%.sqlite3",
	"%.ipynb",
	"node_modules/*",
	-- "%.jpg",
	-- "%.jpeg",
	-- "%.png",
	"%.svg",
	"%.otf",
	"%.ttf",
	"%.webp",
	".dart_tool/",
	".github/",
	".gradle/",
	".idea/",
	".settings/",
	".vscode/",
	"__pycache__/",
	"build/",
	"env/",
	"gradle/",
	"node_modules/",
	"%.pdb",
	"%.dll",
	"%.class",
	"%.exe",
	"%.cache",
	"%.ico",
	"%.pdf",
	"%.dylib",
	"%.jar",
	"%.docx",
	"%.met",
	"smalljre_*/*",
	".vale/",
	"%.burp",
	"%.mp4",
	"%.mkv",
	"%.rar",
	"%.zip",
	"%.7z",
	"%.tar",
	"%.bz2",
	"%.epub",
	"%.flac",
	"%.tar.gz",
}
local _, actions = pcall(require, "telescope.actions")
lvim.builtin.telescope.defaults.mappings = {
	-- for input mode
	i = {
		["<C-n>"] = actions.cycle_history_next,
		["<C-p>"] = actions.cycle_history_prev,

		["<C-j>"] = actions.move_selection_next,
		["<C-k>"] = actions.move_selection_previous,

		["<C-b>"] = actions.results_scrolling_up,
		["<C-f>"] = actions.results_scrolling_down,

		["<C-c>"] = actions.close,

		["<Down>"] = actions.move_selection_next,
		["<Up>"] = actions.move_selection_previous,

		["<CR>"] = actions.select_default,
		["<C-s>"] = actions.select_horizontal,
		["<C-v>"] = actions.select_vertical,
		["<C-t>"] = actions.select_tab,

		["<c-d>"] = require("telescope.actions").delete_buffer,

		["<Tab>"] = actions.close,
		["<S-Tab>"] = actions.close,
		["<C-q>"] = actions.send_to_qflist + actions.open_qflist,
		["<M-q>"] = actions.send_selected_to_qflist + actions.open_qflist,
		["<C-l>"] = actions.complete_tag,
		["<C-h>"] = actions.which_key, -- keys from pressing <C-h>
		["<esc>"] = actions.close,
	},
	-- for normal mode
	n = {
		["<esc>"] = actions.close,
		["<CR>"] = actions.select_default,
		["<C-x>"] = actions.select_horizontal,
		["<C-v>"] = actions.select_vertical,
		["<C-t>"] = actions.select_tab,
		["<C-b>"] = actions.results_scrolling_up,
		["<C-f>"] = actions.results_scrolling_down,

		["<Tab>"] = actions.close,
		["<S-Tab>"] = actions.close,
		["<C-q>"] = actions.send_to_qflist + actions.open_qflist,
		["<M-q>"] = actions.send_selected_to_qflist + actions.open_qflist,

		["j"] = actions.move_selection_next,
		["k"] = actions.move_selection_previous,
		["H"] = actions.move_to_top,
		["M"] = actions.move_to_middle,
		["L"] = actions.move_to_bottom,
		["q"] = actions.close,
		["dd"] = require("telescope.actions").delete_buffer,
		["s"] = actions.select_horizontal,
		["v"] = actions.select_vertical,
		["t"] = actions.select_tab,

		["<Down>"] = actions.move_selection_next,
		["<Up>"] = actions.move_selection_previous,
		["gg"] = actions.move_to_top,
		["G"] = actions.move_to_bottom,

		["<C-u>"] = actions.preview_scrolling_up,
		["<C-d>"] = actions.preview_scrolling_down,

		["<PageUp>"] = actions.results_scrolling_up,
		["<PageDown>"] = actions.results_scrolling_down,

		["?"] = actions.which_key,
	},
}

table.insert(lvim.builtin.telescope.extensions, {
	"fzf",
})

lvim.builtin.telescope.defaults = {
	vimgrep_arguments = {
		"rg",
		"-L",
		"--color=never",
		"--no-heading",
		"--with-filename",
		"--line-number",
		"--column",
		"--smart-case",
	},
	prompt_prefix = "   ",
	selection_caret = "  ",
	entry_prefix = "  ",
	initial_mode = "insert",
	selection_strategy = "reset",
	sorting_strategy = "ascending",
	layout_strategy = "horizontal",
	layout_config = {
		horizontal = {
			prompt_position = "top",
			preview_width = 0.55,
			results_width = 0.8,
		},
		vertical = {
			mirror = false,
		},
		width = 0.80,
		height = 0.75,
		preview_cutoff = 120,
	},
	file_sorter = require("telescope.sorters").get_fuzzy_file,
	file_ignore_patterns = { "node_modules" },
	generic_sorter = require("telescope.sorters").get_generic_fuzzy_sorter,
	path_display = { "truncate" },
	winblend = 0,
	border = {},
	-- borderchars = { "", "", "", "", "", "", "", "" },
	previewer = {
		results_title = false,
		preview_title = false,
	},
	color_devicons = true,
	set_env = { ["COLORTERM"] = "truecolor" }, -- default = nil,
	file_previewer = require("telescope.previewers").vim_buffer_cat.new,
	grep_previewer = require("telescope.previewers").vim_buffer_vimgrep.new,
	qflist_previewer = require("telescope.previewers").vim_buffer_qflist.new,
	-- Developer configurations: Not meant for general override
	buffer_previewer_maker = require("telescope.previewers").buffer_previewer_maker,
	mappings = {
		n = { ["q"] = require("telescope.actions").close },
	},
}
lvim.builtin.telescope.pickers.live_grep = {
	theme = "dropdown",
	enable_preview = true,
}
lvim.builtin.telescope.pickers.grep_string = {
	theme = "dropdown",
	enable_preview = true,
}
lvim.builtin.telescope.pickers.find_files = {
	enable_preview = true,
}
lvim.builtin.telescope.pickers.buffers = {
	theme = "dropdown",
	previewer = false,
	-- initial_mode = "normal",
}
lvim.builtin.telescope.pickers.planets = {
	show_pluto = true,
	show_moon = true,
}
lvim.builtin.telescope.pickers.colorscheme = {
	enable_preview = true,
}
lvim.builtin.telescope.pickers.lsp_references = {
	theme = "dropdown",
	initial_mode = "normal",
}
lvim.builtin.telescope.pickers.lsp_definitions = {
	theme = "dropdown",
	initial_mode = "normal",
}
lvim.builtin.telescope.pickers.lsp_declarations = {
	theme = "cursor",
	initial_mode = "normal",
}
lvim.builtin.telescope.pickers.lsp_implementations = {
	theme = "cursor",
	initial_mode = "normal",
}
lvim.builtin.telescope.pickers.lsp_document_symbols = {
	theme = "dropdown",
	previewer = false,
}

require("telescope-tabs").setup({
	show_preview = false,
	close_tab_shortcut = "C-d",
	initial_mode = "normal",
	theme = "dropdown",
	-- Your custom config :^)
})
