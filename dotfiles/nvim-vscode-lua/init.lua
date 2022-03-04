-- init.lua
if (vim.g.vscode) then
    -- VSCode extension
    vim.cmd([[
        source $HOME/.config/nvim/vscode/vim-plug/plugins.vim
        source $HOME/.config/nvim/vscode/general/settings.vim
        source $HOME/.config/nvim/vscode/general/functions.vim
        source $HOME/.config/nvim/vscode/keys/mappings.vim
        source $HOME/.config/nvim/vscode/settings.vim
        source $HOME/.config/nvim/vscode/plug-config/easymotion.vim
        source $HOME/.config/nvim/vscode/plug-config/highlightyank.vim
        source $HOME/.config/nvim/vscode/plug-config/quickscope.vim]])
else
    -- ordinary neovim
    require "user.options"
    require "user.keymaps"
    require "user.plugins"
    require "user.colorscheme"
    require "user.cmp"
    require "user.lsp"
    require "user.telescope"
    require "user.treesitter"
    require "user.autopairs"
    require "user.comment"
    require "user.gitsigns"
    require "user.nvim-tree"
    require "user.bufferline"
    require "user.lualine"
    require "user.toggleterm"
    require "user.project"
    require "user.impatient"
    require "user.indentline"
    require "user.alpha"
    require "user.whichkey"
    require "user.autocommands"
    require "user.quickscope"
    require "user.hop"
    require "user.matchup"
    require "user.numb"
    require "user.dial"
    require "user.colorizer"
    require "user.spectre"
    require "user.zen-mode"
    require "user.neoscroll"
    require "user.todo-comments"
    require "user.bookmark"
    require "user.renamer"
    require "user.symbol-outline"
    require "user.git-blame"
    require "user.gist"
    require "user.gitlinker"
    require "user.session-manager"
    require "user.notify"
    require "user.ts-context"
    require "user.registers"
    require "user.telescope-file-browser"
    require "user.sniprun"
    require "user.functions"
    -- require "user.copilot"
    require "user.gps"
    require "user.illuminate"
    require "user.rnvimr"
    require "user.distant"
    require "user.rust_tools"
end

