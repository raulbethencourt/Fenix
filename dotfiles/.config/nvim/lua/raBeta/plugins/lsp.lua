local keymap = function(mode, keys, func, desc)
    if desc then
        desc = desc
    end

    vim.keymap.set(mode, keys, func, { noremap = true, silent = true, desc = desc })
end

return {
    {
        "sourcegraph/sg.nvim",
        dependencies = {
            "nvim-lua/plenary.nvim",
            "nvim-telescope/telescope.nvim",
            'onsails/lspkind.nvim',
        },
        config = function()
            ---@diagnostic disable-next-line: missing-parameter
            require('sg').setup()

            keymap('n', '<leader>ss', [[<cmd>lua require('sg.extensions.telescope').fuzzy_search_results()<cr>]],
                '[S]g [S]earch result')
            keymap('n', '<leader>cc', [[:CodyToggle<cr>]],
                '[C]ody toggle')
            keymap({ 'n', 'v' }, '<leader>ct', [[:CodyTask]],
                '[C]ody [T]ask')
            keymap({ 'n', 'v' }, '<leader>ca', [[:CodyAsk<cr>]],
                '[C]ody [A]sk')
            keymap('v', '<leader>ce', [[:CodyExplain<cr>]],
                '[C]ody [E]xplain')
        end,
    },
    {
        'kosayoda/nvim-lightbulb',
        event = 'LspAttach',
        config = function()
            require('nvim-lightbulb').setup {
                autocmd = { enabled = true },
                sign = {
                    enabled = true,
                    text = require('icons').diagnostics.BoldHint,
                    hl = 'LightBulbSign',
                },
            }
        end,
    },
    {
        'nvimtools/none-ls.nvim',
        event = 'VeryLazy',
        requires = { 'nvim-lua/plenary.nvim' },
        config = function()
            require 'raBeta.configs.lsp.none-ls'
        end,
    },
    {
        'neovim/nvim-lspconfig',
        dependencies = {
            { 'williamboman/mason.nvim', config = true },
            'williamboman/mason-lspconfig.nvim',
            'folke/neodev.nvim',
        },
    },
    {
        'hrsh7th/nvim-cmp',
        dependencies = {
            'L3MON4D3/LuaSnip',
            'saadparwaiz1/cmp_luasnip',
            'hrsh7th/cmp-nvim-lsp',
            'hrsh7th/cmp-nvim-lua',
            'rafamadriz/friendly-snippets',
            'hrsh7th/cmp-buffer',
            'hrsh7th/cmp-path',
            'hrsh7th/cmp-nvim-lsp-signature-help',
            'hrsh7th/cmp-vsnip',
        },
        config = function()
            require 'raBeta.configs.lsp.cmp'
        end,
    },
    {
        'nvim-treesitter/nvim-treesitter',
        dependencies = {
            'nvim-treesitter/nvim-treesitter-textobjects',
            'gbprod/php-enhanced-treesitter.nvim',
            { 'derekstride/tree-sitter-sql', build = ':TSInstall sql' },
        },
        build = ':TSUpdate',
        config = function()
            require 'raBeta.configs.treesitter'
        end,
    },
    {
        'saecki/crates.nvim',
        event = { 'BufRead Cargo.toml' },
        opts = {
            src = {
                cmp = { enabled = true },
            },
        },
        config = function()
            require('crates').setup {
                null_ls = {
                    enabled = true,
                    name = 'crates.nvim',
                },
                popup = {
                    border = 'rounded',
                },
            }
        end,
    },
    {
        'simrat39/rust-tools.nvim',
        lazy = true,
        opts = function()
            local ok, mason_registry = pcall(require, 'mason-registry')
            local adapter ---@type any
            if ok then
                -- rust tools configuration for debugging support
                local codelldb = mason_registry.get_package 'codelldb'
                local extension_path = codelldb:get_install_path() .. '/extension/'
                local codelldb_path = extension_path .. 'adapter/codelldb'
                local liblldb_path = ''
                if vim.loop.os_uname().sysname:find 'Windows' then
                    liblldb_path = extension_path .. 'lldb\\bin\\liblldb.dll'
                elseif vim.fn.has 'mac' == 1 then
                    liblldb_path = extension_path .. 'lldb/lib/liblldb.dylib'
                else
                    liblldb_path = extension_path .. 'lldb/lib/liblldb.so'
                end
                adapter = require('rust-tools.dap').get_codelldb_adapter(codelldb_path, liblldb_path)
            end
            return {
                dap = {
                    adapter = adapter,
                },
                tools = {
                    on_initialized = function()
                        vim.cmd [[
                augroup RustLSP
                  autocmd CursorHold                      *.rs silent! lua vim.lsp.buf.document_highlight()
                  autocmd CursorMoved,InsertEnter         *.rs silent! lua vim.lsp.buf.clear_references()
                  autocmd BufEnter,CursorHold,InsertLeave *.rs silent! lua vim.lsp.codelens.refresh()
                augroup END
              ]]
                    end,
                },
            }
        end,
        config = function() end,
    },
    {
        'ray-x/lsp_signature.nvim',
        event = 'BufRead',
        config = function()
            require('lsp_signature').setup()
        end,
    },
}
