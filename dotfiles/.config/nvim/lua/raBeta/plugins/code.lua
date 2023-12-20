return {
  {
    'kristijanhusak/vim-dadbod-ui',
    dependencies = {
      { 'tpope/vim-dadbod', lazy = true },
      { 'kristijanhusak/vim-dadbod-completion', ft = { 'sql', 'mysql', 'plsql' }, lazy = true },
    },
    cmd = {
      'DBUI',
      'DBUIToggle',
      'DBUIAddConnection',
      'DBUIFindBuffer',
    },
  },
  {
    'rest-nvim/rest.nvim',
    dependencies = { 'nvim-lua/plenary.nvim' },
    -- latest commit breaks formatting
    commit = '8b62563',
    config = function()
      require('rest-nvim').setup {
        result_split_horizontal = false,
        result_split_in_place = true,
        skip_ssl_verification = false,
        encode_url = true,
        highlight = {
          enabled = true,
          timeout = 150,
        },
        result = {
          show_url = false,
          show_curl_command = false,
          show_http_info = true,
          show_headers = true,
          formatters = {
            json = 'jq',
            html = function(body)
              return vim.fn.system({ 'tidy', '-i', '-q', '-' }, body)
            end,
          },
        },
        jump_to_request = false,
        env_file = '.env',
        custom_dynamic_variables = {},
        yank_dry_run = true,
      }
    end,
  },
  {
    'ThePrimeagen/harpoon',
    branch = "harpoon2",
  },
  'tpope/vim-sleuth',
  'mbbill/undotree',
  { 'folke/which-key.nvim', opts = true },
  { 'numToStr/Comment.nvim', opts = true, lazy = false },
  { 'aserowy/tmux.nvim', config = true },
  {
    'nvim-telescope/telescope.nvim',
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
    },
  },
  {
    'folke/flash.nvim',
    event = 'VeryLazy',
    vscode = true,
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
  { 'max397574/better-escape.nvim', config = true },
}
