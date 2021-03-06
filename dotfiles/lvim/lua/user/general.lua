-- vim config
vim.opt.backup = false
vim.opt.relativenumber = true
vim.opt.fileencoding = 'utf-8'
vim.opt.shiftwidth = 4
vim.opt.tabstop = 4
vim.opt.cmdheight = 1
vim.opt.clipboard = "unnamedplus"
vim.opt.hlsearch = true
vim.opt.ignorecase = true
vim.opt.mouse = "a"
vim.opt.pumheight = 10
vim.opt.smartcase = true
vim.opt.smartindent = true
vim.opt.undofile = true
vim.opt.expandtab = true
vim.opt.shiftwidth = 4
vim.opt.tabstop = 4
vim.opt.scrolloff = 8
vim.opt.sidescrolloff = 8
vim.opt.wrap = false

-- lvim config
lvim.log.level = "warn"
lvim.format_on_save = false

-- livm autocommands
lvim.autocommands.custom_groups = {
  { "BufWinEnter", "*", "set fcs=eob:\\ " }, --no tilde left
}
