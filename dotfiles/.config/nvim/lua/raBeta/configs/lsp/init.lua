require 'raBeta.configs.lsp.cmp'
require 'raBeta.configs.lsp.none-ls'
require 'raBeta.configs.lsp.languages.php'

local on_attach = function(_, bufnr)
  local nmap = function(keys, func, desc)
    if desc then
      desc = 'LSP: ' .. desc
    end

    vim.keymap.set('n', keys, func, { buffer = bufnr, desc = desc })
  end

  nmap('gr', '<cmd>Telescope lsp_references<CR>', '[G]oto [D]definition')
  nmap('gd', '<cmd>Telescope lsp_definitions<CR>', '[G]oto [D]definition')
  nmap('gD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
  nmap('gI', vim.lsp.buf.implementation, '[G]oto [I]mplementation')
  nmap('<C-k>', vim.lsp.buf.signature_help, 'Signature Documentation')
  nmap('gl', '<cmd>lua vim.diagnostic.open_float()<CR>', 'Show line diagnostics')
  nmap('<leader>ld', vim.lsp.buf.type_definition, 'Type [D]efinition')
  nmap('<leader>lf', function()
    vim.lsp.buf.format { async = true }
  end, '[F]ormat')
  nmap('<leader>lD', '<cmd>Telescope diagnostics<CR>', 'Telescope [D]iagnostics')
  nmap('<leader>ls', require('telescope.builtin').lsp_document_symbols, '[D]ocument [S]ymbols')
  nmap('<leader>lw', require('telescope.builtin').lsp_dynamic_workspace_symbols, '[W]orkspace [S]ymbols')
  nmap('<leader>lr', vim.lsp.buf.rename, '[R]e[n]ame')
  nmap('<leader>la', vim.lsp.buf.code_action, '[C]ode [A]ction')
  nmap('<leader>ln', vim.lsp.buf.add_workspace_folder, '[W]orkspace [A]dd Folder')
  nmap('<leader>lx', vim.lsp.buf.remove_workspace_folder, '[W]orkspace [R]emove Folder')
  nmap('<leader>lI', '<cmd>Mason<cr>', '[M]ason')
  nmap('<leader>li', '<cmd>LspInfo<cr>', '[L]sp[I]nfo')
  nmap('<leader>ll', function()
    print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
  end, '[W]orkspace [L]ist Folders')
end

vim.filetype.add {
  extension = {
    zsh = 'zsh',
  },
}

-- Get intelephense licence
local get_intelephense_license = function()
  local f = assert(io.open(os.getenv 'HOME' .. '/intelephense/licence.txt', 'rb'))
  local content = f:read '*a'
  f:close()
  return string.gsub(content, '%s+', '')
end

local servers = {
  emmet_ls = {
    filetypes = { 'twig', 'html', 'typescriptreact', 'javascriptreact', 'css', 'sass', 'scss', 'less' },
    init_options = {
      html = {
        options = {
          ['bem.enabled'] = true,
        },
      },
    },
  },
  bashls = {
    filetypes = { 'sh', 'zsh' },
  },
  clangd = {},
  rust_analyzer = {},
  html = { filetypes = { 'html', 'twig', 'hbs' } },
  cssls = {},
  lua_ls = {
    Lua = {
      workspace = { checkThirdParty = false },
      telemetry = { enable = false },
      format = {
        enable = true,
        defaultConfig = {
          indent_style = 'space',
          indent_size = '4',
        },
      },
    },
  },
  htmx = { filetypes = { 'html', 'twig', 'php' } },
  intelephense = {
    filetypes = { 'php' },
    init_options = {
      licenceKey = get_intelephense_license(),
      storagePath = '/home/rabeta/.intelephense',
      clearCache = false,
      files = {
        maxSize = 5000000,
      },
      phpMemoryLimit = '4096M',
    },
    diagnostics = {
      enable = true,
    },
    flags = {
      debounce_text_changes = 150,
    },
  },
  eslint = {},
  sqlls = {
    sql = {
      'sql-language-server',
      'up',
      '--method',
      'stdio',
    },
  },
}

-- disblae inline hints
vim.diagnostic.config {
  virtual_text = false,
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = ' ',
      [vim.diagnostic.severity.WARN] = ' ',
      [vim.diagnostic.severity.HINT] = ' ',
      [vim.diagnostic.severity.INFO] = ' ',
    },
    linehl = {
      [vim.diagnostic.severity.ERROR] = '',
      [vim.diagnostic.severity.WARN] = '',
      [vim.diagnostic.severity.HINT] = '',
      [vim.diagnostic.severity.INFO] = '',
    },
    numhl = {
      [vim.diagnostic.severity.WARN] = 'WarningMsg',
      [vim.diagnostic.severity.ERROR] = 'ErrorMsg',
      [vim.diagnostic.severity.HINT] = 'HintMsg',
      [vim.diagnostic.severity.INFO] = 'InfoMsg',
    },
  },
}

require('neodev').setup()

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities = require('cmp_nvim_lsp').default_capabilities(capabilities)

local mason_lspconfig = require 'mason-lspconfig'

mason_lspconfig.setup {
  ensure_installed = vim.tbl_keys(servers),
}

mason_lspconfig.setup_handlers {
  function(server_name)
    require('lspconfig')[server_name].setup {
      capabilities = capabilities,
      on_attach = on_attach,
      settings = servers[server_name],
      filetypes = (servers[server_name] or {}).filetypes,
    }
  end,
}
