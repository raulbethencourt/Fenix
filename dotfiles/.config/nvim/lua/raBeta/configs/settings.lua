-- NOTE: options

local options = {
  backup = false,                                -- creates a backup file
  clipboard = 'unnamedplus',                     -- allows neovim to access the system clipboard
  cmdheight = 0,                                 -- more space in the neovim command line for displaying messages
  completeopt = { 'menuone', 'noselect' },       -- mostly just for cmp
  conceallevel = 0,                              -- so that `` is visible in markdown files
  fileencoding = 'utf-8',                        -- the encoding written to a file
  hlsearch = false,                              -- highlight all matches on previous search pattern
  incsearch = true,
  ignorecase = true,                             -- ignore case in search patterns
  mouse = 'a',                                   -- allow the mouse to be used in neovim
  pumheight = 10,                                -- pop up menu height
  showmode = false,                              -- we don't need to see things like -- INSERT -- anymore
  showtabline = 2,                               -- always show tabs
  smartcase = true,                              -- smart case
  smartindent = true,                            -- make indenting smarter again
  splitbelow = true,                             -- force all horizontal splits to go below current window
  splitright = true,                             -- force all vertical splits to go to the right of current window
  swapfile = false,                              -- creates a swapfile
  undofile = true,                               -- enable persistent undo
  updatetime = 200,                              -- faster completion (4000ms default)
  writebackup = false,                           -- if a file is being edited by another program (or was written to file while editing with another program), it is not allowed to be edited
  expandtab = true,                              -- convert tabs to spaces
  shiftwidth = 4,                                -- the number of spaces inserted for each indentation
  tabstop = 4,                                   -- insert 4 spaces for a tab
  cursorline = true,                             -- highlight the current line
  number = true,                                 -- set numbered lines
  relativenumber = true,                         -- set relative numbered lines
  numberwidth = 2,                               -- set number column width to 2 {default 4}
  signcolumn = 'yes',                            -- always show the sign column, otherwise it would shift the text each time
  wrap = false,                                  -- display lines as one long line
  scrolloff = 8,                                 -- is one of my fav
  sidescrolloff = 8,
  colorcolumn = '99999',                         -- fixes indentline for now
  foldmethod = 'manual',                         -- folding set to "expr" for treesitter based folding
  foldexpr = '',                                 -- set to "nvim_treesitter#foldexpr()" for treesitter based folding
  hidden = true,                                 -- required to keep multiple buffers and open multiple buffers
  undodir = os.getenv 'HOME' .. '/.vim/undodir', -- where to save undo histories
  spell = false,                                 -- trigger spellcheck
  spelllang = 'en',                              -- language of spellcheck
  background = 'dark',                           -- triggers dark colorscheme
  shell = 'zsh',
  inccommand = 'split',                          -- Preview substitutions live, as you type!
  timeout = true,
  timeoutlen = 500,
  ruler = false,
  equalalways = true,
  guicursor = table.concat({
    'n-v-c:block-Cursor/lCursor-blinkwait100-blinkon50-blinkoff50',
    'i-ci:ver25-Cursor/lCursor-blinkwait100-blinkon50-blinkoff50',
    'r:hor50-Cursor/lCursor-blinkwait50-blinkon50-blinkoff80',
  }, ','),
}
for k, v in pairs(options) do
  vim.opt[k] = v
end

vim.opt.shortmess:append 'c'

-- NOTE: globals
local globals = {
  showtabline = 0,
  netrw_banner = 0,
  netrw_liststyle = 0,
  netrw_localcopycmd = 'cp',
  netrw_localcopydircmd = 'cp -r',
  loaded_perl_provider = 0,
}
for k, v in pairs(globals) do
  vim.g[k] = v
end
