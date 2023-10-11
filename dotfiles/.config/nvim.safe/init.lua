-- VS Code settings
if vim.g.vscode then
    require "vscode.mappings_vscode"


    local cmd = {
        [[source $HOME/.config/nvim/general/settings.vim]],
        [[source $HOME/.config/nvim/general/functions.vim]],
        [[source $HOME/.config/nvim/plug-config/highlightyank.vim]],
        [[source $HOME/.config/nvim/plug-config/polyglot.vim]],
        [[source $HOME/.config/nvim/plug-config/quickscope.vim]],
        [[source $HOME/.config/nvim/vim-plug/plugins.vim]],
        [[source $HOME/.config/nvim/vscode/settings.vim]],
        [[nnoremap z= <Cmd>call VSCodeNotify('keyboard-quickfix.openQuickFix')<CR>]],
    }

    for i, v in ipairs(cmd) do
        vim.cmd(v)
    end

    require "plugins.lightspeed"
    -- Neovim settings
else
    -- prepare neovide
    if vim.g.neovide then
        vim.g.neovide_remember_window_size = true
        vim.g.neovide_remember_window_position = true
        vim.g.neovide_cursor_antialiasing = true
        vim.g.neovide_fullscreen = false
        vim.g.neovide_cursor_trail_legnth = 0
        vim.g.neovide_cursor_animation_length = 0
        vim.o.guifont = { "FiraCode Nerd Font", ":h11" }
    end

    -- General Settings
    require "config.settings"
    require "config.lazy"
    -- require "config.keymaps"
    -- require "raBeta.colorscheme"
    -- require "raBeta.cmp"
    -- require "raBeta.lsp"
    -- require "raBeta.telescope"
    -- require "raBeta.treesitter"
    -- require "raBeta.autopairs"
    -- require "raBeta.comment"
    -- require "raBeta.gitsigns"
    -- require "raBeta.nvim-tree"
    -- require "raBeta.toggleterm"
    -- require "raBeta.bufferline"
    -- require "raBeta.lualine"
    -- require "raBeta.dressing"
end
