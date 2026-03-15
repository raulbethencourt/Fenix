return {
    {
        'nvimtools/none-ls.nvim',
        event = 'VeryLazy',
        dependencies = { 'nvim-lua/plenary.nvim' },
        config = function()
            require 'raBeta.configs.lsp.none-ls'
        end,
    },
    {
        'neovim/nvim-lspconfig',
        dependencies = {
            { 'williamboman/mason.nvim', config = true },
            'williamboman/mason-lspconfig.nvim',
            'WhoIsSethDaniel/mason-tool-installer.nvim',
            { 'j-hui/fidget.nvim' },
        },
    },
    {
        'ray-x/lsp_signature.nvim',
        event = 'BufRead',
        config = function()
            require('lsp_signature').setup {
                bind = true,
                handler_opts = {
                    border = 'rounded',
                },
            }
        end,
    },
    {
        'nvim-treesitter/nvim-treesitter',
        lazy = false,
        branch = 'main',
        dependencies = {
            {
                'nvim-treesitter/nvim-treesitter-textobjects',
                branch = 'main',
                event = 'VeryLazy',
            },
        },
        build = ':TSUpdate',
        config = function()
            require 'raBeta.configs.treesitter'
        end,
    },
}
