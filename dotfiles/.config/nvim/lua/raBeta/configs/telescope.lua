local action_layout = require 'telescope.actions.layout'
local icons = require 'icons'

require('telescope').setup {
  defaults = {
    vimgrep_arguments = {
      'rg',
      '-L',
      '--color=never',
      '--no-heading',
      '--with-filename',
      '--line-number',
      '--column',
      '--smart-case',
      '--trim',
    },
    prompt_prefix = '  ' .. icons.ui.Target .. '  ',
    selection_caret = '  ',
    entry_prefix = '  ',
    initial_mode = 'insert',
    selection_strategy = 'reset',
    sorting_strategy = 'ascending',
    layout_strategy = 'horizontal',
    layout_config = {
      horizontal = {
        prompt_position = 'top',
        preview_width = 0.55,
        results_width = 0.8,
      },
      vertical = {
        mirror = false,
      },
      width = 0.80,
      height = 0.75,
      preview_cutoff = 120,
    },
    file_sorter = require('telescope.sorters').get_fuzzy_file,
    file_ignore_patterns = { 'node_modules', 'vendor', 'upgrades', 'upload', 'cache' },
    generic_sorter = require('telescope.sorters').get_generic_fuzzy_sorter,
    path_display = { 'truncate' },
    winblend = 0,
    border = false,
    previewer = {
      results_title = false,
      preview_title = false,
    },
    preview = {
      filesize_limit = 0.1, -- MB
      treesitter = false,   -- treesitter freezes on big files
    },
    color_devicons = true,
    set_env = { ['COLORTERM'] = 'truecolor' }, -- default = nil,
    file_previewer = require('telescope.previewers').vim_buffer_cat.new,
    grep_previewer = require('telescope.previewers').vim_buffer_vimgrep.new,
    qflist_previewer = require('telescope.previewers').vim_buffer_qflist.new,
    buffer_previewer_maker = require('telescope.previewers').buffer_previewer_maker,
    mappings = {
      n = {
        ['q'] = require('telescope.actions').close,
        ['<M-p>'] = action_layout.toggle_preview,
      },
      i = {
        ['<C-u>'] = false,
        ['<C-d>'] = false,
        ['<M-p>'] = action_layout.toggle_preview,
      },
    },
  },
  extensions = {
    ['ui-select'] = {
      require('telescope.themes').get_dropdown {
        winblend = 0,
        previewer = false,
        border = false,
        layout_strategy = 'vertical',
        layout_config = {
          height = 0.2,
          prompt_position = 'top',
          width = 0.3,
        },
      },
    },
    fzf = {
      override_generic_sorter = true, -- override the generic sorter
      override_file_sorter = true,    -- override the file sorter
      case_mode = 'smart_case',       -- or "ignore_case" or "respect_case"
    },
  },
}

-- Enable telescope fzf native, if installed
require('telescope').load_extension 'fzf'
require('telescope').load_extension 'live_grep_args'
require('telescope').load_extension 'ui-select'
require('telescope').load_extension 'noice'

local function is_git_repo()
  vim.fn.system 'git rev-parse --is-inside-work-tree'
  return vim.v.shell_error == 0
end

local function get_git_root()
  local dot_git_path = vim.fn.finddir('.git', '.;')
  return vim.fn.fnamemodify(dot_git_path, ':h')
end

function Git_root(builtin, opts)
  if is_git_repo() then
    table.insert(opts, {
      cwd = get_git_root(),
    })
  end
  require('telescope.builtin')[builtin](opts)
end

-- Keymaps
local keymap = vim.keymap.set

-- use telescop for references and definitions
keymap('n', 'gr', '<cmd>Telescope lsp_references<CR>', { desc = '[G]o to [R]references' })
keymap('n', 'gd', '<cmd>Telescope lsp_definitions<CR>', { desc = '[G]o to [D]definitions' })

keymap('n', '<leader><space>', function()
  require('telescope.builtin').buffers(require('telescope.themes').get_dropdown {
    winblend = 0,
    previewer = false,
    border = false,
    layout_strategy = 'vertical',
    layout_config = {
      height = 0.2,
      prompt_position = 'bottom',
      width = 0.3,
    },
  })
end, { desc = 'Buffers' })

keymap('n', '<leader>sl', "<cmd>lua require('telescope').extensions.live_grep_args.live_grep_args()<CR>",
  { desc = '[S]earch [L]ive Grep Args' })

keymap('n', '<leader>sf', "<cmd>lua Git_root('find_files', {})<cr>", { desc = '[S]earch [F]iles' })
keymap('n', '<leader>sr', require('telescope.builtin').oldfiles, { desc = '[S]earch [R]ecently opened files' })
keymap('n', '<leader>sg', require('telescope.builtin').git_files, { desc = '[S]earch [G]it Files' })
keymap('n', '<leader>sh', require('telescope.builtin').help_tags, { desc = '[S]earch [H]elp' })
keymap('n', '<leader>sw', require('telescope.builtin').grep_string, { desc = '[S]earch current [W]ord' })
keymap('n', '<leader>sc', require('telescope.builtin').colorscheme, { desc = '[S]earch [C]olorscheme' })
keymap('n', '<leader>sk', require('telescope.builtin').keymaps, { desc = '[S]earch [K]eymaps' })
keymap('n', '<leader>sm', function()
  require('telescope.builtin').man_pages { sections = { 'ALL' } }
end, { desc = '[S]earch [M]an pages' })
keymap('n', '<leader>sb', function()
  require('telescope.builtin').current_buffer_fuzzy_find(require('telescope.themes').get_dropdown {
    winblend = 0,
    previewer = true,
    border = false,
    layout_strategy = 'vertical',
    layout_config = {
      height = 0.6,
      prompt_position = 'top',
      width = 0.4,
      preview_height = 0.5,
    },
  })
end, { desc = '[S]earch in current [B]uffer' })

keymap('n', '<leader>st', '<cmd>TodoTelescope<CR>', { desc = '[S]search [T]odo' })
