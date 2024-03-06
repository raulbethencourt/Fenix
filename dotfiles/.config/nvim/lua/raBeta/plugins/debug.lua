return {
  'mfussenegger/nvim-dap',
  dependencies = {
    'rcarriga/nvim-dap-ui',
    'williamboman/mason.nvim',
    'jay-babu/mason-nvim-dap.nvim',
    {
      'theHamsta/nvim-dap-virtual-text',
      config = {
        highlight_changed_variables = true, -- highlight changed values with NvimDapVirtualTextChanged, else always NvimDapVirtualText
        highlight_new_as_changed = false,   -- highlight new variables in the same way as changed variables (if highlight_changed_variables)
        show_stop_reason = true,            -- show stop reason when stopped for exceptions
        commented = false,                  -- prefix virtual text with comment string
        only_first_definition = false,      -- only show virtual text at first definition (if there are multiple)
      },
    },
  },
  config = function()
    local dap = require 'dap'
    local dapui = require 'dapui'
    local icons = require 'icons'

    require('mason-nvim-dap').setup {
      automatic_setup = true,
      handlers = {},
      ensure_installed = {
        'codelldb',
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

    ---@diagnostic disable-next-line: missing-fields
    dapui.setup {
      ---@diagnostic disable-next-line: missing-fields
      icons = {
        expanded = icons.ui.TriangleShortArrowDown,
        collapsed = icons.ui.TriangleShortArrowRight,
        circular = icons.ui.circular,
      },
      mappings = {
        -- Use a table to apply multiple mappings
        expand = { '<CR>', '<2-LeftMouse>' },
        open = 'o',
        remove = 'd',
        edit = 'e',
        repl = 'r',
        toggle = 't',
      },
      -- Use this to override mappings for specific elements
      element_mappings = {},
      expand_lines = true,
      layouts = {
        {
          elements = {
            { id = 'scopes',      size = 0.55 },
            { id = 'breakpoints', size = 0.10 },
            { id = 'stacks',      size = 0.25 },
            { id = 'watches',     size = 0.10 },
          },
          size = 0.33,
          position = 'right',
        },
        {
          elements = {
            { id = 'repl',    size = 0.45 },
            { id = 'console', size = 0.55 },
          },
          size = 0.10,
          position = 'bottom',
        },
      },
      controls = {
        enabled = true,
        -- Display controls in this element
        element = 'repl',
        icons = {
          pause = icons.dap.pause,
          play = icons.dap.play,
          step_into = icons.dap.step_into,
          step_over = icons.dap.step_over,
          step_out = icons.dap.step_out,
          step_back = icons.dap.step_back,
          run_last = icons.dap.run_last,
          terminate = icons.dap.terminate,
        },
      },
      floating = {
        max_height = 0.9,
        max_width = 0.5, -- Floats will be treated as percentage of your screen.
        border = 'rounded',
        mappings = {
          close = { 'q', '<Esc>' },
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
  end,
}
