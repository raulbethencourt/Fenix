require 'raBeta.configs.lsp.languages.php'

-- NOTE: stop saving lsp logs, change to 'debug' to see them
vim.lsp.set_log_level 'off'
local on_attach = function(_, bufnr)
    local keymap = function(keys, func, desc)
        if desc then
            desc = 'LSP: ' .. desc
        end

        vim.keymap.set('n', keys, func, { buffer = bufnr, desc = desc })
    end

    keymap('gr', '<cmd>Telescope lsp_references<CR>', '[G]oto [R]eferences')
    keymap('gd', '<cmd>Telescope lsp_definitions<CR>', '[G]oto [D]definition')
    keymap('gD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
    keymap('gI', vim.lsp.buf.implementation, '[G]oto [I]mplementation')
    keymap('<C-k>', vim.lsp.buf.signature_help, 'Signature Documentation')
    keymap('gl', '<cmd>lua vim.diagnostic.open_float()<CR>', '[G]oto [L]ine diagnostics')
    keymap('<leader>ld', vim.lsp.buf.type_definition, '[L]sp Type [D]efinition')

    keymap('<leader>lf', function()
        vim.lsp.buf.format { async = true }
    end, '[L]sp [F]ormat')

    keymap('<leader>lD', '<cmd>Telescope diagnostics<CR>', '[L]sp Telescope Workspace [D]iagnostics')

    keymap('<leader>lb', function()
        require('telescope.builtin').diagnostics(require('telescope.themes').get_dropdown {
            winblend = 0,
            previewer = true,
            layout_strategy = 'vertical',
            layout_config = {
                height = 0.5,
                prompt_position = 'top',
                width = 0.4,
                preview_height = 0.6,
            },
            bufnr = 0,
            no_sign = true,
        })
    end, '[L]sp Telescope [B]uffer Diagnostics')

    keymap('<leader>ls', function()
        require('telescope.builtin').lsp_document_symbols(require('telescope.themes').get_dropdown {
            winblend = 0,
            previewer = true,
            layout_strategy = 'vertical',
            layout_config = {
                height = 0.5,
                prompt_position = 'top',
                width = 0.4,
                preview_height = 0.6,
            },
            bufnr = 0,
            no_sign = true,
        })
    end, '[L]sp Document [S]ymbols')

    keymap('<leader>lw', require('telescope.builtin').lsp_dynamic_workspace_symbols, '[L]sp [W]orkspace symbols')
    keymap('<leader>lr', vim.lsp.buf.rename, '[L]sp [R]ename')
    keymap('<leader>la', vim.lsp.buf.code_action, '[L]sp code [A]ction')
    keymap('<leader>ln', vim.lsp.buf.add_workspace_folder, '[L]sp [W]orkspace [A]dd Folder')
    keymap('<leader>lx', vim.lsp.buf.remove_workspace_folder, '[L]sp [W]orkspace [R]emove Folder')
    keymap('<leader>lI', '<cmd>Mason<cr>', '[L]sp [I]nstall with mason')
    keymap('<leader>li', '<cmd>LspInfo<cr>', '[L]sp [I]nfo')
    keymap('<leader>ll', function()
        print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
    end, '[L]sp [W]orkspace [L]ist Folders')
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
    jqls = {
        filetypes = { 'json', 'jsonc' },
    },
    bashls = {
        filetypes = { 'sh', 'zsh', 'bash' },
    },
    clangd = {},
    rust_analyzer = {
        settings = {
            ['rust-analyzer'] = {
                cargo = {
                    allFeatures = true,
                    loadOutDirsFromCheck = true,
                    runBuildScripts = true,
                },
                checkOnSave = {
                    allFeatures = true,
                    command = 'clippy',
                    extraArgs = { '--no-deps' },
                },
                procMacro = {
                    enable = true,
                    ignored = {
                        ['async-trait'] = { 'async_trait' },
                        ['napi-derive'] = { 'napi' },
                        ['async-recursion'] = { 'async_recursion' },
                    },
                },
            },
        },
    },
    taplo = {},
    marksman = {},
    html = { filetypes = { 'html', 'twig', 'hbs' } },
    cssls = {},
    lua_ls = {
        settings = {
            Lua = {
                runtime = { version = 'LuaJIT' },
                workspace = {
                    checkThirdParty = false,
                    library = {
                        '${3rd}/luv/library',
                        unpack(vim.api.nvim_get_runtime_file('', true)),
                    },
                },
                telemetry = { enable = false },
                format = { enable = false },
            },
        },
    },
    htmx = { filetypes = { 'html', 'twig', 'php' } },
    -- phpactor = {
    --     init_options = {
    --         ["language_server_psalm.enabled"] = false,
    --         ["language_server_php_cs_fixer.enabled"] = false,
    --         ["language_server_completion.trim_leading_dollar"] = true,
    --         ["language_server_phpstan.enabled"] = true,
    --         ["language_server_phpstan.bin"] = "/home/rabeta/.local/share/nvim/mason/bin/phpstan",
    --         ["symfony.enabled"] = true,
    --         ["completion_worse.completor.docblock.enabled"] = true,
    --     }
    -- },
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
        format = {
            enable = false,
        },
        flags = {
            debounce_text_changes = 150,
        },
    },
    tsserver = {},
    sqlls = {
        filetypes = { 'sql' },
        sql = {
            'sql-language-server',
            'up',
            '--method',
            'stdio',
        },
    },
}

local icons = require 'icons'
-- disblae inline hints
vim.diagnostic.config {
    update_in_insert = true,
    underline = true,
    severity_sort = false,
    float = {
        border = 'rounded',
        source = 'always',
        header = '',
        prefix = '',
    },
    virtual_text = false,
    signs = {
        text = {
            [vim.diagnostic.severity.ERROR] = icons.diagnostics.Error .. ' ',
            [vim.diagnostic.severity.WARN] = icons.diagnostics.Warning .. ' ',
            [vim.diagnostic.severity.HINT] = icons.diagnostics.Hint .. ' ',
            [vim.diagnostic.severity.INFO] = icons.diagnostics.Information .. ' ',
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

local function rust_opts(name)
    local plugin = require('lazy.core.config').plugins[name]
    if not plugin then
        return {}
    end
    local Plugin = require 'lazy.core.plugin'
    return Plugin.values(plugin, 'opts', false)
end

mason_lspconfig.setup {
    ensure_installed = vim.tbl_keys(servers),
    rust_analyzer = function(_, opts)
        local rust_tools_opts = rust_opts 'rust-tools.nvim'
        require('rust-tools').setup(vim.tbl_deep_extend('force', rust_tools_opts or {}, { server = opts }))
        return true
    end,
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
