return {
    {
        'sainnhe/everforest',
        lazy = false,
        priority = 1000,
        enabled = true,
        config = function()
            vim.g.everforest_background = 'hard'
            vim.g.everforest_better_performance = true
            vim.g.everforest_transparent_background = 2
            vim.g.everforest_cursor = 'orange'
            vim.g.everforest_ui_contrast = 'low'
            vim.g.everforest_float_style = 'dim'
            -- vim.cmd [[colorscheme everforest]]
        end,
    },
    {
        'folke/tokyonight.nvim',
        lazy = false,
        priority = 1000,
        enabled = true,
        config = function()
            require("tokyonight").setup({
                style = 'night',
                transparent = true,
            })
            -- vim.cmd [[colorscheme tokyonight]]
        end,
    },
    {
        'shatur/neovim-ayu',
        lazy = false,
        priority = 1000,
        enabled = true,
        config = function()
            require('ayu').setup({
                mirage = false,
                terminal = true,
                overrides = {
                    Normal = { bg = "None" },
                    ColorColumn = { bg = "None" },
                    SignColumn = { bg = "None" },
                    Folded = { bg = "None" },
                    FoldColumn = { bg = "None" },
                    CursorLine = { bg = "None" },
                    CursorColumn = { bg = "None" },
                    WhichKeyFloat = { bg = "None" },
                    VertSplit = { bg = "None" },
                },
            })
            vim.cmd [[colorscheme ayu-dark]]
        end,
    },
    {
        'catppuccin/nvim',
        lazy = false,
        priority = 1000,
        enabled = true,
        config = function()
            require("catppuccin").setup({
                flavour = "mocha",
                transparent_background = true,
                integrations = {
                    cmp = true,
                    gitsigns = true,
                    nvimtree = false,
                    treesitter = true,
                    notify = true,
                    mini = {
                        enabled = false,
                        indentscope_color = "",
                    },
                },
            })
            -- vim.cmd [[colorscheme catppuccin]]
        end,
    },
    {
        'stevearc/dressing.nvim',
        lazy = true,
        init = function()
            ---@diagnostic disable-next-line: duplicate-set-field
            vim.ui.select = function(...)
                require('lazy').load { plugins = { 'dressing.nvim' } }
                return vim.ui.select(...)
            end
            ---@diagnostic disable-next-line: duplicate-set-field
            vim.ui.input = function(...)
                require('lazy').load { plugins = { 'dressing.nvim' } }
                return vim.ui.input(...)
            end
        end,
    },
    {
        'folke/noice.nvim',
        event = 'VeryLazy',
        opts = {},
        dependencies = {
            { 'MunifTanjim/nui.nvim', lazy = true },
            {
                'rcarriga/nvim-notify',
                keys = {
                    {
                        '<leader>un',
                        function()
                            require('notify').dismiss { silent = true, pending = true }
                        end,
                        desc = 'Dismiss all Notifications',
                    },
                },
                opts = {
                    timeout = 3500,
                    background_colour = '#000000',
                    render = 'compact',
                },
            },
        },
        config = function()
            require('noice').setup {
                lsp = {
                    -- override markdown rendering so that **cmp** and other plugins use **Treesitter**
                    override = {
                        ['vim.lsp.util.convert_input_to_markdown_lines'] = true,
                        ['vim.lsp.util.stylize_markdown'] = true,
                        ['cmp.entry.get_documentation'] = true,
                    },
                    signature = {
                        enabled = false,
                    },
                },
                messages = {
                    enabled = true,  -- enables the Noice messages UI
                    view = 'notify', -- default view for messages
                },
                routes = {
                    {
                        filter = {
                            event = 'msg_show',
                            any = {
                                { find = '%d+L, %d+B' },
                                { find = '; after #%d+' },
                                { find = '; before #%d+' },
                            },
                        },
                        view = 'mini',
                    },
                },
                -- you can enable a preset for easier configuration
                presets = {
                    bottom_search = true,         -- use a classic bottom cmdline for search
                    command_palette = false,      -- position the cmdline and popupmenu together
                    long_message_to_split = true, -- long messages will be sent to a split
                    inc_rename = false,           -- enables an input dialog for inc-rename.nvim
                    lsp_doc_border = 'rounded',   -- add a border to hover docs and signature help
                },
                views = {
                    cmdline_popup = {
                        border = {
                            style = 'none',
                            padding = { 2, 3 },
                        },
                        filter_options = {},
                        win_options = {
                            winhighlight = 'NormalFloat:NormalFloat,FloatBorder:FloatBorder',
                        },
                        position = {
                            row = 10,
                            col = '50%',
                        },
                        size = {
                            width = 100,
                            height = 'auto',
                        },
                    },
                    popupmenu = {
                        relative = 'editor',
                        position = {
                            row = 15,
                            col = '50%',
                        },
                        size = {
                            width = 100,
                            height = 10,
                        },
                        border = {
                            style = 'none',
                            padding = { 2, 3 },
                        },
                        win_options = {
                            winhighlight = { Normal = 'Normal', FloatBorder = 'DiagnosticInfo' },
                        },
                    },
                },
            }
        end,
    },
    {
        'folke/lsp-colors.nvim',
        config = function()
            require('lsp-colors').setup {
                Error = '#db4b4b',
                Warning = '#e0af68',
                Information = '#0db9d7',
                Hint = '#10B981',
            }
        end,
    },
    {
        'norcalli/nvim-colorizer.lua',
        config = function()
            require('colorizer').setup({ '*' }, {
                RGB = true,      -- #RGB hex codes
                RRGGBB = true,   -- #RRGGBB hex codes
                RRGGBBAA = true, -- #RRGGBBAA hex codes
                rgb_fn = true,   -- CSS rgb() and rgba() functions
                hsl_fn = true,   -- CSS hsl() and hsla() functions
                css = true,      -- Enable all CSS features: rgb_fn, hsl_fn, names, RGB, RRGGBB
                css_fn = true,   -- Enable all CSS *functions*: rgb_fn, hsl_fn
            })
        end,
    },
}
