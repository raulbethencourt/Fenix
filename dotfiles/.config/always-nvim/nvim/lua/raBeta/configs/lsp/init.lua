local capabilities = vim.lsp.protocol.make_client_capabilities()

-- Get intelephense licence
local get_intelephense_license = function()
    local license_path = os.getenv 'HOME' .. '/intelephense/licence.txt'
    local f, err = io.open(license_path, 'rb')

    if not f then
        vim.notify('Intelephense license file not found at: ' .. license_path .. ' - using free version', vim.log.levels.INFO)
        return nil
    end

    local content = f:read '*a'
    f:close()

    if not content or content == '' then
        vim.notify('Intelephense license file is empty - using free version', vim.log.levels.WARN)
        return nil
    end

    -- Remove whitespace and newlines
    local license = string.gsub(content, '%s+', '')
    if license == '' then
        vim.notify('Intelephense license appears to be empty after cleaning - using free version', vim.log.levels.WARN)
        return nil
    end

    return license
end

-- Stop saving lsp logs, change to 'debug' to see them
vim.lsp.log.set_level 'off'
vim.api.nvim_create_autocmd('LspAttach', {
    callback = function(args)
        -- TODO: refactor this code
        local keymap = function(keys, func, desc)
            if desc then
                desc = 'LSP: ' .. desc
            end

            vim.keymap.set('n', keys, func, { buffer = args.buf, desc = desc })
        end

        keymap('<C-k>', function()
            require('lsp_signature').toggle_float_win()
        end, 'toggle signature')
        keymap('K', function()
            vim.lsp.buf.hover {
                border = 'rounded',
            }
        end, 'toggle signature')
        keymap('gr', vim.lsp.buf.references, '[G]oto [R]eferences')
        keymap('gd', vim.lsp.buf.definition, '[G]oto [D]definition')
        keymap('gD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
        keymap('gl', '<cmd>lua vim.diagnostic.open_float()<CR>', '[G]oto [L]ine diagnostics')
        keymap('<leader>ld', vim.lsp.buf.type_definition, '[L]sp Type [D]efinition')

        keymap('<leader>lf', function()
            vim.lsp.buf.format { async = true }
        end, '[L]sp [F]ormat')
        vim.keymap.set('v', '<leader>lf', require('raBeta.utils.utils').visual_format, { buffer = args.buf, desc = 'Visual [F]ormat' })
        keymap('<leader>lr', vim.lsp.buf.rename, '[L]sp [R]ename')
        keymap('<leader>la', vim.lsp.buf.code_action, '[L]sp code [A]ction')
        keymap('<leader>ln', vim.lsp.buf.add_workspace_folder, '[L]sp [W]orkspace [A]dd Folder')
        keymap('<leader>lx', vim.lsp.buf.remove_workspace_folder, '[L]sp [W]orkspace [R]emove Folder')
        keymap('<leader>lI', '<cmd>Mason<cr>', '[L]sp [I]nstall with mason')
        keymap('<leader>li', '<cmd>LspInfo<cr>', '[L]sp [I]nfo')
        keymap('<leader>ll', function()
            print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
        end, '[L]sp [W]orkspace [L]ist Folders')
    end,
})

-- Servers configuration
local servers = {
    bashls = {
        filetypes = { 'sh', 'zsh', 'bash' },
    },
    marksman = {},
    html = { filetypes = { 'html', 'twig', 'hbs' } },
    yamlls = {},
}

-- Add license to intelephense if available
local license = get_intelephense_license()
if license and servers.intelephense then
    servers.intelephense.init_options.licenceKey = license
end

for server, config in pairs(servers) do
    vim.lsp.enable(server)
    vim.lsp.config[server] = config
end
vim.filetype.add {
    extension = {
        zsh = 'zsh',
    },
}
vim.lsp.config('*', {
    capabilities = capabilities,
})

-- Diagnostic configuration
local icons = require 'icons'
vim.diagnostic.config {
    update_in_insert = true,
    underline = true,
    severity_sort = false,
    float = {
        border = 'rounded',
        source = true,
        header = '',
        prefix = '',
    },
    -- disblae inline hints
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
