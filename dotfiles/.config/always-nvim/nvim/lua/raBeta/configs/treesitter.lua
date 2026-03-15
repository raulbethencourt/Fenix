---@diagnostic disable-next-line: missing-fields
require('nvim-treesitter').setup {
    ensure_installed = {
        'bash',
        'c',
        'cpp',
        'css',
        'go',
        'html',
        'json',
        'lua',
        'markdown',
        'markdown_inline',
        'php',
        'python',
        'regex',
        'rust',
        'sql',
        'toml',
        'tsx',
        'twig',
        'typescript',
        'vim',
        'vimdoc',
        'yaml',
        'zig',
        'zsh',
    },
    auto_install = true,
    highlight = { enable = true },
    indent = { enable = true },
    incremental_selection = {
        enable = false,
    },
    textobjects = {
        select = {
            enable = true,
            lookahead = true, -- Automatically jump forward to textobj, similar to targets.vim
            keymaps = {
                ['aa'] = '@parameter.outer',
                ['ia'] = '@parameter.inner',
                ['af'] = '@function.outer',
                ['if'] = '@function.inner',
                ['ac'] = '@class.outer',
                ['ic'] = '@class.inner',
            },
        },
        move = {
            enable = true,
            set_jumps = true, -- whether to set jumps in the jumplist
            goto_next_start = {
                [']m'] = '@function.outer',
                [']]'] = '@class.outer',
            },
            goto_next_end = {
                [']M'] = '@function.outer',
                [']['] = '@class.outer',
            },
            goto_previous_start = {
                ['[m'] = '@function.outer',
                ['[['] = '@class.outer',
            },
            goto_previous_end = {
                ['[M'] = '@function.outer',
                ['[]'] = '@class.outer',
            },
        },
    },
}
