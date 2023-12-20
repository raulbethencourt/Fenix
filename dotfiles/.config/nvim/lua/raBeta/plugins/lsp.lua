return {
  { 'mfussenegger/nvim-lint' },
  {
    'stevearc/conform.nvim',
    event = { 'BufWritePre' },
    cmd = { 'ConformInfo' },
    keys = {
      {
        -- Customize or remove this keymap to your liking
        '<leader>lf',
        function()
          require('conform').format { async = true, lsp_fallback = true }
        end,
        mode = '',
        desc = 'Format buffer',
      },
    },
    -- Everything in opts will be passed to setup()
    opts = {
      -- Define your formatters
      formatters_by_ft = {
        sql = { 'sql_formatter' },
        rust = { 'rustfmt' },
        html = { 'prettier' },
        css = { 'prettier' },
        scss = { 'prettier' },
        twig = { 'prettier' },
        json = { 'prettier' },
        yaml = { 'prettier' },
        markdown = { 'prettier' },
        vue = { 'prettier' },
        http = { 'prettier' },
        lua = { 'stylua' },
        sh = { 'shfmt' },
        bash = { 'shfmt' },
        zsh = { 'shfmt' },
        php = { 'pretty-php' },
        python = { 'isort', 'black' },
        javascript = { { 'prettierd', 'prettier' } },
      },
      -- Customize formatters
      formatters = {
        shfmt = {
          prepend_args = { '-i', '2' },
        },
      },
    },
    init = function()
      -- If you want the formatexpr, here is the place to set it
      vim.o.formatexpr = "v:lua.require'conform'.formatexpr()"
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
    'j-hui/fidget.nvim',
    tag = 'legacy',
    event = 'LspAttach',
    opts = true,
  },
  {
    'hrsh7th/nvim-cmp',
    dependencies = {
      'L3MON4D3/LuaSnip',
      'saadparwaiz1/cmp_luasnip',
      'hrsh7th/cmp-nvim-lsp',
      'rafamadriz/friendly-snippets',
    },
  },
  {
    'nvim-treesitter/nvim-treesitter',
    dependencies = {
      'nvim-treesitter/nvim-treesitter-textobjects',
    },
    build = ':TSUpdate',
  },
  {
    'gbprod/php-enhanced-treesitter.nvim',
    dependencies = {
      { 'derekstride/tree-sitter-sql', run = ':TSInstall sql' },
    },
  },
  -- {
  --   'saecki/crates.nvim',
  --   event = { 'BufRead Cargo.toml' },
  --   config = function()
  --     require('crates').setup {
  --       null_ls = {
  --         enabled = true,
  --         name = 'crates.nvim',
  --       },
  --       popup = {
  --         border = 'rounded',
  --       },
  --     }
  --   end,
  -- },
  -- {
  --   'simrat39/rust-tools.nvim',
  --   lazy = true,
  --   opts = function()
  --     local ok, mason_registry = pcall(require, 'mason-registry')
  --     local adapter ---@type any
  --     if ok then
  --       -- rust tools configuration for debugging support
  --       local codelldb = mason_registry.get_package 'codelldb'
  --       local extension_path = codelldb:get_install_path() .. '/extension/'
  --       local codelldb_path = extension_path .. 'adapter/codelldb'
  --       local liblldb_path = vim.fn.has 'mac' == 1 and extension_path .. 'lldb/lib/liblldb.dylib' or extension_path .. 'lldb/lib/liblldb.so'
  --       adapter = require('rust-tools.dap').get_codelldb_adapter(codelldb_path, liblldb_path)
  --     end
  --     return {
  --       dap = {
  --         adapter = adapter,
  --       },
  --       tools = {
  --         on_initialized = function()
  --           vim.cmd [[
  --               augroup RustLSP
  --                 autocmd CursorHold                      *.rs silent! lua vim.lsp.buf.document_highlight()
  --                 autocmd CursorMoved,InsertEnter         *.rs silent! lua vim.lsp.buf.clear_references()
  --                 autocmd BufEnter,CursorHold,InsertLeave *.rs silent! lua vim.lsp.codelens.refresh()
  --               augroup END
  --             ]]
  --         end,
  --       },
  --     }
  --   end,
  --   config = function() end,
  -- },
  {
    'ray-x/lsp_signature.nvim',
    event = 'BufRead',
    config = function()
      require('lsp_signature').setup()
    end,
  },
}
