local lineLengthWarning = 80
local lineLengthError = 120
local colors = {
  bg       = '#32302f',
  fg       = '#bbc2cf',
  yellow   = '#d8a657',
  cyan     = '#ddc7a1',
  darkblue = '#081633',
  green    = '#98be65',
  orange   = '#b47109',
  violet   = '#d3869b',
  magenta  = '#c14a4a',
  blue     = '#7daea3',
  red      = '#ea6962',
  border   = '#a89984',  
}

lvim.builtin.lualine.sections = {
	lualine_a = {},
	lualine_b = {},
	lualine_c = {},
	lualine_x = {},
	lualine_y = {},
	lualine_z = {},
}
lvim.builtin.lualine.inactive_sections = {
	lualine_a = {},
	lualine_b = {},
	lualine_c = {},
	lualine_x = {},
	lualine_y = {},
	lualine_z = {},
}

lvim.builtin.lualine.options = {
	-- Disable sections and component separators
	component_separators = "",
	section_separators = "",
	theme = {
		-- We are going to use lualine_c an lualine_x as left and
		-- right section. Both are highlighted by c theme .  So we
		-- are just setting default looks o statusline
		normal = { c = { fg = colors.fg, bg = colors.bg } },
		inactive = { c = { fg = colors.fg, bg = colors.bg } },
	}
}

-- highlight, Insert and Rag status functions {{{2
local function highlight(group, fg, bg, gui)
	local cmd = string.format("hi! %s guifg=%s guibg=%s", group, fg, bg)
	local cmdInv = string.format("hi! %sInv guifg=%s guibg=%s", group, bg, fg)

	if gui ~= nil then
		cmd = cmd .. " gui=" .. gui
	end

	vim.cmd(cmd)
	vim.cmd(cmdInv)
end

local function highlightGroup(group, icon, bg, text)
	highlight("Lualine" .. group .. "Lft", icon, colors.bg)
	highlight("Lualine" .. group .. "Mid", icon, bg)
	highlight("Lualine" .. group .. "Txt", text, bg)
	highlight("Lualine" .. group .. "End", bg, colors.bg)
end

local function ins_left(component)
	table.insert(lvim.builtin.lualine.sections.lualine_c, component)
end

local function ins_right(component)
	table.insert(lvim.builtin.lualine.sections.lualine_x, component)
end

local function setLineWidthColours()
	local colbg = colors.statsbg
	local linebg = colors.statsiconbg

	if vim.fn.col(".") > lineLengthError then
		colbg = colors.linelongerrorfg
	elseif vim.fn.col(".") > lineLengthWarning then
		colbg = colors.linelongwarnfg
	end

	if vim.fn.strwidth(vim.fn.getline(".")) > lineLengthError then
		linebg = colors.linelongerrorfg
	elseif vim.fn.strwidth(vim.fn.getline(".")) > lineLengthWarning then
		linebg = colors.linelongwarnfg
	end

	highlight("LinePosHighlightStart", colbg, colors.statsbg)
	highlight("LinePosHighlightColNum", colors.statstext, colbg)
	highlight("LinePosHighlightMid", linebg, colbg)
	highlight("LinePosHighlightLenNum", colors.statstext, linebg)
	highlight("LinePosHighlightEnd", linebg, colors.statsbg)
end

local function getGitUrl()
	local cmd = "git ls-remote --get-url 2> /dev/null"
	local file = assert(io.popen(cmd, "r"))
	local url = file:read("*all")
	file:close()
	return url
	-- return "github"
end

local function getGitIcon()
	local giturl = getGitUrl()

	if giturl == nil then
		return icons["git"]
	elseif string.find(giturl, "github") then
		return icons["github"]
	elseif string.find(giturl, "bitbucket") then
		return icons["gitbitbucket"]
	elseif string.find(giturl, "stash") then
		return icons["gitbitbucket"]
	elseif string.find(giturl, "gitlab") then
		return icons["gitlab"]
	elseif string.find(giturl, "hg") then
		return icons["hg"]
	end

	return icons["git"]
end

local conditions = {
	display_mode = function()
		return vim.fn.winwidth(0) > 60
	end,
	display_pos = function()
		return vim.fn.winwidth(0) > 80
	end,
	display_stats = function()
		return vim.fn.winwidth(0) > 100
	end,
	display_git = function()
		if getGitUrl() == nil then
			return false
		end

		return vim.fn.winwidth(0) > 120
	end,
	display_lsp = function()
		local clients = vim.lsp.get_active_clients()

		if next(clients) == nil then
			return false
		end

		return vim.fn.winwidth(0) > 140
	end,
}

local conditions = {
	buffer_not_empty = function()
		return vim.fn.empty(vim.fn.expand("%:t")) ~= 1
	end,
	hide_in_width = function()
		return vim.fn.winwidth(0) > 80
	end,
	check_git_workspace = function()
		local filepath = vim.fn.expand("%:p:h")
		local gitdir = vim.fn.finddir(".git", filepath .. ";")
		return gitdir and #gitdir > 0 and #gitdir < #filepath
	end,
}


ins_left({
	function()
		return ""
	end,
	color = { fg = colors.border }, -- Sets highlighting of component
	padding = { left = 0, right = 1 }, -- We don't need space before this
})

ins_left({
	-- mode component
	function()
		return " "
	end,
	color = function()
		-- auto change color according to neovims mode
		local mode_color = {
			n = colors.red,
			i = colors.green,
			v = colors.blue,
			[""] = colors.blue,
			V = colors.blue,
			c = colors.magenta,
			no = colors.red,
			s = colors.orange,
			S = colors.orange,
			[""] = colors.orange,
			ic = colors.yellow,
			R = colors.violet,
			Rv = colors.violet,
			cv = colors.red,
			ce = colors.red,
			r = colors.cyan,
			rm = colors.cyan,
			["r?"] = colors.cyan,
			["!"] = colors.red,
			t = colors.red,
		}
		return { fg = mode_color[vim.fn.mode()] }
	end,
	padding = { right = 1 },
})

ins_left({
	-- filesize component
	"filesize",
	cond = conditions.buffer_not_empty,
})

ins_left({
	"filename",
	cond = conditions.buffer_not_empty,
	color = { fg = colors.magenta, gui = "bold" },
})

ins_left({ "location" })

ins_left({ "progress", color = { fg = colors.fg, gui = "bold" } })

ins_left({
	"diagnostics",
	sources = { "nvim_diagnostic" },
	symbols = { error = " ", warn = " ", info = " " },
	diagnostics_color = {
		color_error = { fg = colors.red },
		color_warn = { fg = colors.yellow },
		color_info = { fg = colors.cyan },
	},
})

-- Insert mid section. You can make any number of sections in neovim :)
-- for lualine it's any number greater then 2
-- ins_left({
-- 	function()
-- 		return "%="
-- 	end,
-- })

ins_right({
	-- Lsp server name .
	function()
		local msg = "No Active Lsp"
		local buf_ft = vim.api.nvim_buf_get_option(0, "filetype")
		local clients = vim.lsp.get_active_clients()
		if next(clients) == nil then
			return msg
		end
		for _, client in ipairs(clients) do
			local filetypes = client.config.filetypes
			if filetypes and vim.fn.index(filetypes, buf_ft) ~= -1 then
				return client.name
			end
		end
		return msg
	end,
	icon = " LSP:",
	color = { fg = "#ffffff", gui = "bold" },
})

-- Add components to right sections
ins_right({
	"o:encoding", -- option component same as &encoding in viml
	fmt = string.upper, -- I'm not sure why it's upper case either ;)
	cond = conditions.hide_in_width,
	color = { fg = colors.green, gui = "bold" },
})

ins_right({
	"fileformat",
	fmt = string.upper,
	icons_enabled = false, -- I think icons are cool but Eviline doesn't have them. sigh
	color = { fg = colors.green, gui = "bold" },
})

ins_right({
	"branch",
	icon = "",
	color = { fg = colors.violet, gui = "bold" },
})

ins_right({
	"diff",
	-- Is it me or the symbol for modified us really weird
	symbols = { added = " ", modified = "柳 ", removed = " " },
	diff_color = {
		added = { fg = colors.green },
		modified = { fg = colors.orange },
		removed = { fg = colors.red },
	},
	cond = conditions.hide_in_width,
})

ins_right({
	function()
		return ""
	end,
	color = { fg = colors.border },
	padding = { left = 1 },
})
