local lspkind = require 'lspkind'
lspkind.init()

local luasnip = require 'luasnip'
require('luasnip.loaders.from_vscode').lazy_load()
require('luasnip.loaders.from_vscode').lazy_load { paths = { '~/.config/nvim/snippets' } }
luasnip.config.setup {}
vim.keymap.set({ 'i', 's' }, '<c-k>', function()
    if luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
    end
end, { silent = true })
vim.keymap.set({ 'i', 's' }, '<c-j>', function()
    if luasnip.jumpable(-1) then
        luasnip.jump(-1)
    end
end, { silent = true })
vim.keymap.set({ 'i', 's' }, '<c-l>', function()
    if luasnip.choice_active() then
        luasnip.change_choice(1)
    end
end, { silent = true })

local cmp = require 'cmp'
cmp.setup {
    snippet = {
        expand = function(args)
            luasnip.lsp_expand(args.body)
        end,
    },
    mapping = cmp.mapping.preset.insert {
        ['<C-n>'] = cmp.mapping.select_next_item(),
        ['<C-p>'] = cmp.mapping.select_prev_item(),
        ['<C-d>'] = cmp.mapping.scroll_docs(-4),
        ['<C-f>'] = cmp.mapping.scroll_docs(4),
        ['<C-Space>'] = cmp.mapping.complete {},
        ['<CR>'] = cmp.mapping.confirm {
            behavior = cmp.ConfirmBehavior.Replace,
            select = true,
        },
        ['<Tab>'] = cmp.mapping(function(fallback)
            if cmp.visible() then
                cmp.select_next_item()
            elseif luasnip.expand_or_locally_jumpable() then
                luasnip.expand_or_jump()
            else
                fallback()
            end
        end, { 'i', 's' }),
        ['<S-Tab>'] = cmp.mapping(function(fallback)
            if cmp.visible() then
                cmp.select_prev_item()
            elseif luasnip.locally_jumpable(-1) then
                luasnip.jump(-1)
            else
                fallback()
            end
        end, { 'i', 's' }),
    },
    sources = {
        { name = 'nvim_lsp' },
        { name = 'luasnip' },
        { name = 'codeium' },
        { name = 'nvim_lsp_signature_help' },
        { name = 'path' },
        { name = 'buffer' },
        { name = 'crates' },
        {
            name = 'nvim_lua',
            keyword_length = 2,
        },
        {
            name = 'vsnip',
            keyword_length = 2,
        },
    },
    ---@diagnostic disable-next-line: missing-fields
    formatting = {
        format = lspkind.cmp_format {
            mode = 'symbol',
            maxwidth = 50,
            ellipsis_char = '...',
            symbol_map = { Codeium = '' },
        },
    },
}
