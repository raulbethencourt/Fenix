-- NOTE: recover icons
local icons = require 'icons'

return {
    {
        'lewis6991/gitsigns.nvim',
        opts = {
            signs = {
                add = {
                    hl = 'GitSignsAdd',
                    text = icons.ui.BoldLineLeft,
                    numhl = 'GitSignsAddNr',
                    linehl = 'GitSignsAddLn',
                },
                change = {
                    hl = 'GitSignsChange',
                    text = icons.ui.BoldLineLeft,
                    numhl = 'GitSignsChangeNr',
                    linehl = 'GitSignsChangeLn',
                },
                delete = {
                    hl = 'GitSignsDelete',
                    text = icons.ui.Triangle,
                    numhl = 'GitSignsDeleteNr',
                    linehl = 'GitSignsDeleteLn',
                },
                topdelete = {
                    hl = 'GitSignsDelete',
                    text = icons.ui.Triangle,
                    numhl = 'GitSignsDeleteNr',
                    linehl = 'GitSignsDeleteLn',
                },
                changedelete = {
                    hl = 'GitSignsChange',
                    text = icons.ui.BoldLineLeft,
                    numhl = 'GitSignsChangeNr',
                    linehl = 'GitSignsChangeLn',
                },
            },
            signcolumn = true,
            numhl = false,
            linehl = false,
            word_diff = false,
            watch_gitdir = {
                interval = 1000,
                follow_files = true,
            },
            auto_attach = false,
            attach_to_untracked = true,
            current_line_blame = false, -- Toggle with `:Gitsigns toggle_current_line_blame`
            current_line_blame_opts = {
                virt_text = true,
                virt_text_pos = 'eol', -- 'eol' | 'overlay' | 'right_align'
                delay = 1000,
                ignore_whitespace = false,
            },
            current_line_blame_formatter = '<author>, <author_time:%Y-%m-%d> - <summary>',
            sign_priority = 6,
            status_formatter = nil, -- Use default
            update_debounce = 200,
            max_file_length = 40000,
            preview_config = {
                -- Options passed to nvim_open_win
                border = 'rounded',
                style = 'minimal',
                relative = 'cursor',
                row = 0,
                col = 1,
            },
        },
    },
    {
        'ThePrimeagen/harpoon',
        branch = 'harpoon2',
        dependencies = { 'nvim-lua/plenary.nvim' },
    },
    'mbbill/undotree',
    {
        'folke/which-key.nvim',
        opts = true,
    },
    {
        'aserowy/tmux.nvim',
        config = true,
    },
    {
        'nvim-telescope/telescope.nvim',
        event = 'VeryLazy',
        branch = '0.1.x',
        dependencies = {
            'nvim-lua/plenary.nvim',
            {
                'nvim-telescope/telescope-fzf-native.nvim',
                build = 'make',
                cond = function()
                    return vim.fn.executable 'make' == 1
                end,
            },
            {
                'nvim-telescope/telescope-live-grep-args.nvim',
                version = '^1.0.0',
            },
            'nvim-telescope/telescope-ui-select.nvim',
            'nvim-tree/nvim-web-devicons',
        },
    },
    {
        'folke/flash.nvim',
        event = 'VeryLazy',
        opts = {},
        keys = {
            {
                's',
                mode = { 'n', 'x', 'o' },
                function()
                    require('flash').jump()
                end,
                desc = 'Flash',
            },
            {
                'S',
                mode = { 'n', 'o', 'x' },
                function()
                    require('flash').treesitter()
                end,
                desc = 'Flash Treesitter',
            },
            {
                'r',
                mode = 'o',
                function()
                    require('flash').remote()
                end,
                desc = 'Remote Flash',
            },
            {
                'R',
                mode = { 'o', 'x' },
                function()
                    require('flash').treesitter_search()
                end,
                desc = 'Treesitter Search',
            },
            {
                '<c-s>',
                mode = { 'c' },
                function()
                    require('flash').toggle()
                end,
                desc = 'Toggle Flash Search',
            },
        },
    },
}
