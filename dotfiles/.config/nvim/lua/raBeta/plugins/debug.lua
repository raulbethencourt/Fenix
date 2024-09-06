return {
    'mfussenegger/nvim-dap',
    dependencies = {
        'rcarriga/nvim-dap-ui',
        'williamboman/mason.nvim',
        'theHamsta/nvim-dap-virtual-text',
        'jay-babu/mason-nvim-dap.nvim',
        "nvim-neotest/nvim-nio"
    },
    config = function()
        local dap = require 'dap'
        local dapui = require 'dapui'
        local icons = require 'icons'

        ---@diagnostic disable-next-line: missing-parameter
        require('nvim-dap-virtual-text').setup()

        ---@diagnostic disable-next-line: missing-fields
        require('mason-nvim-dap').setup {
            automatic_setup = true,
            handlers = {},
            ensure_installed = {
                'codelldb',
                'php-debug-adapter',
                'bash-debug-adapter',
            },
        }

        -- NOTE: keymaps
        vim.keymap.set('n', '<F5>', dap.continue, { desc = 'Debug: Start/Continue' })
        vim.keymap.set('n', '<F11>', dap.step_into, { desc = 'Debug: Step Into' })
        vim.keymap.set('n', '<s-F11>', dap.step_out, { desc = 'Debug: Step Out' })
        vim.keymap.set('n', '<F10>', dap.step_over, { desc = 'Debug: Step Over' })
        vim.keymap.set('n', '<s-F10>', dap.step_back, { desc = 'Debug: Step Back' })
        vim.keymap.set('n', '<leader>db', dap.toggle_breakpoint, { desc = '[D]ebug Toggle [B]reakpoint' })
        vim.keymap.set('n', '<leader>dc', dap.clear_breakpoints, { desc = '[D]ebug [C]lear Breakpoints' })
        vim.keymap.set('n', '<leader>dB', function()
            dap.set_breakpoint(vim.fn.input 'Breakpoint condition: ')
        end, { desc = '[D]ebug Set [B]reakpoint' })
        vim.keymap.set('n', '<leader>dt', dapui.toggle, { desc = '[D]ebug [T]oggle Ui' })
        vim.keymap.set({ 'v', 'n' }, '<leader>de', '<Cmd>lua require("dapui").eval()<CR>',
            { desc = '[D]ebug [E]xpression evaluation' })
        vim.keymap.set('n', '<leader>df', '<Cmd>lua require("dapui").float_element()<CR>',
            { desc = '[D]ebug [F]loating element' })
        vim.keymap.set('n', '<leader>ds', '<Cmd>DapDisconnect<CR>',
            { desc = '[D]ebug [S]top' })

        ---@diagnostic disable-next-line: missing-fields
        dapui.setup {
            -- Use this to override mappings for specific elements
            element_mappings = {},
            expand_lines = true,
            layouts = {
                {
                    elements = {
                        { id = 'watches',     size = 0.35 },
                        { id = 'stacks',      size = 0.20 },
                        { id = 'scopes',      size = 0.35 },
                        { id = 'breakpoints', size = 0.10 },
                    },
                    size = 0.33,
                    position = 'right',
                },
                {
                    elements = {
                        { id = 'repl',    size = 0.45 },
                        { id = 'console', size = 0.55 },
                    },
                    size = 0.15,
                    position = 'bottom',
                },
            },
            windows = { indent = 1 },
            ---@diagnostic disable-next-line: missing-fields
            render = {
                max_type_length = nil, -- Can be integer or nil.
                max_value_lines = 100, -- Can be integer or nil.
            },
        }
        dap.listeners.after.event_initialized['dapui_config'] = dapui.open
        dap.listeners.before.event_terminated['dapui_config'] = dapui.close
        dap.listeners.before.event_exited['dapui_config'] = dapui.close

        -- NOTE: set up signs style
        vim.fn.sign_define('DapBreakpoint', {
            text = icons.dap.breakpoint,
            texthl = 'WarningMsg',
            linehl = '',
            numhl = '',
        })
        vim.fn.sign_define('DapStopped', {
            text = icons.ui.BoldArrowRight,
            texthl = 'FloatFooter',
            linehl = '',
            numhl = '',
        })
        vim.fn.sign_define('DapBreakpointRejected', {
            text = icons.ui.BoldClose,
            texthl = 'ErrorMsg',
            linehl = '',
            numhl = '',
        })
        vim.fn.sign_define('DapBreakpointCondition', {
            text = icons.dap.breakpoint_condition,
            texthl = 'WarningMsg',
            linehl = '',
            numhl = '',
        })
    end,
}
