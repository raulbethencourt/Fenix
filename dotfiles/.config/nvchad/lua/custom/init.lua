-- OPTIONS
local options = {
  undodir = vim.fn.stdpath "cache" .. "/undo",
  spell = false,
  spelllang = "en",
  background = "dark", -- triggers dark colorscheme
  scrolloff = 8, -- is one of my fav
  sidescrolloff = 8,
  hlsearch = false, -- highlight all matches on previous search pattern
  incsearch = true,
  ignorecase = true, -- ignore case in search patterns
  smartcase = true, -- smart case
  smartindent = true, -- make indenting smarter again
  relativenumber = true, -- set relative numbered lines
  number = true, -- set numbered lines
  expandtab = true, -- convert tabs to spaces
  shiftwidth = 4, -- the number of spaces inserted for each indentation
  tabstop = 4, -- insert 2 spaces for a tab
  wrap = false,
  guifont = { "FiraCode Nerd Font", ":h11" },
}

vim.opt.shortmess:append "c"

for k, v in pairs(options) do
  vim.opt[k] = v
end

-- Neovide
vim.g.neovide_remember_window_size = true
vim.g.neovide_remember_window_position = true
vim.g.neovide_cursor_antialiasing = true
vim.g.neovide_fullscreen = false

-- AUTOCOMMANDS
local autocmd = vim.api.nvim_create_autocmd

vim.cmd.highlight.on_yank(true)

-- highlight yank
autocmd("TextYankPost ", {
  pattern = "*",
  command = "silent! lua vim.highlight.on_yank()",
})

-- Auto resize panes when resizing nvim window
autocmd("VimResized", {
  pattern = "*",
  command = "tabdo wincmd =",
})

