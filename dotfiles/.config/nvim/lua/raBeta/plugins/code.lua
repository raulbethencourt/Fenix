local keymap = function(mode, keys, func, desc)
    if desc then
        desc = desc
    end

    vim.keymap.set(mode, keys, func, { noremap = true, silent = true, desc = desc })
end

return {
    {
        'stevearc/oil.nvim',
        opts = {},
        -- Optional dependencies
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
            require('oil').setup {
                skip_confirm_for_simple_edits = true,
                keymaps = {
                    ['<C-h>'] = false,
                    ['<C-l>'] = false,
                },
                view_options = {
                    show_hidden = true,
                },
                float = {
                    padding = 2,
                    max_width = 200,
                    max_height = 55,
                    border = "rounded",
                    win_options = {
                        winblend = 0,
                    },
                },
                preview = {
                    win_options = {
                        winblend = 0,
                    },
                },
                progress = {
                    win_options = {
                        winblend = 0,
                    },
                },
            }
            keymap('n', '<leader>e', require('oil').toggle_float,
                '[O]il [T]oggle float')
        end,
    },
    {
        'lewis6991/gitsigns.nvim',
        config = function()
            require('gitsigns').setup {
                preview_config = {
                    border = 'rounded',
                    style = 'minimal',
                    relative = 'cursor',
                    row = 1,
                    col = 1,
                }
            }
            keymap('n', '<leader>gb', '<cmd>Gitsigns blame_line<CR>', '[G]itsigns [B]lame line')
            keymap('n', '<leader>gd', '<cmd>Gitsigns diffthis<CR>', '[G]itsigns [D]iff this')
        end,
    },
    {
        'ThePrimeagen/harpoon',
        branch = 'harpoon2',
        dependencies = { 'nvim-lua/plenary.nvim' },
        config = function()
            local harpoon = require 'harpoon'

            harpoon:setup {
                settings = {
                    save_on_toggle = true,
                    sync_on_ui_close = true,
                    key = function()
                        ---@diagnostic disable-next-line: return-type-mismatch
                        return vim.loop.cwd()
                    end,
                },
            }

            vim.keymap.set('n', '<leader>fs', function()
                harpoon:list():add()
            end, { desc = 'Add file' })
            vim.keymap.set('n', '<leader>fd', function()
                harpoon.ui:toggle_quick_menu(harpoon:list())
            end, { desc = 'Menu' })

            vim.keymap.set('n', '<leader>fj', function()
                harpoon:list():select(1)
            end, { desc = 'File 1' })
            vim.keymap.set('n', '<leader>fk', function()
                harpoon:list():select(2)
            end, { desc = 'File 2' })
            vim.keymap.set('n', '<leader>fl', function()
                harpoon:list():select(3)
            end, { desc = 'File 3' })
            vim.keymap.set('n', '<leader>fm', function()
                harpoon:list():select(4)
            end, { desc = 'File 4' })

            vim.keymap.set('n', '<leader>fp', function()
                harpoon:list():prev()
            end)
            vim.keymap.set('n', '<leader>fn', function()
                harpoon:list():next()
            end)
        end,
    },
    {
        'mbbill/undotree',
        config = function()
            keymap('n', '<leader>u', '<cmd>UndotreeToggle<CR>', 'Toggle [U]ndoTree')
        end
    },
    {
        'folke/which-key.nvim',
        event = "VeryLazy",
        opts = {
            win = {
                border = 'rounded',
                title = false
            }
        },
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
        config = function()
            require 'raBeta.configs.telescope'
        end,
    },
    {
        'folke/flash.nvim',
        event = 'VeryLazy',
        opts = {
            modes = {
                search = {
                    enabled = true,
                }
            }
        },
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
