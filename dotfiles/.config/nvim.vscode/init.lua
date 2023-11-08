-- VS Code settings
if vim.g.vscode then
    require "raBeta.mappings_vscode"

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

    -- require "raBeta.hop"
    require "raBeta.hop"
    require "raBeta.nvim-surround"
else
    -- General Settings
    require "raBeta.settings"
    require "raBeta.keymaps"
    require "raBeta.plugins"
    require "raBeta.colorscheme"
    require "raBeta.cmp"
    require "raBeta.lsp"
    require "raBeta.telescope"
    require "raBeta.treesitter"
    require "raBeta.autopairs"
    require "raBeta.comment"
    require "raBeta.undotree"
    require "raBeta.gitsigns"
end
