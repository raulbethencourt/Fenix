return {
    {
        'folke/flash.nvim',
        event = 'VeryLazy',
        opts = {
            modes = {
                search = {
                    enabled = true,
                },
            },
        },
        keys = {
            {
                'S',
                mode = { 'n', 'x', 'o' },
                function()
                    require('flash').jump()
                end,
                desc = 'Flash',
            },
            {
                'SS',
                mode = { 'n', 'o', 'x' },
                function()
                    require('flash').treesitter()
                end,
                desc = 'Flash Treesitter',
            },
        },
    },
    {
        'echasnovski/mini.ai',
        version = false,
        config = function()
            require('mini.ai').setup()
        end,
    },
    {
        'echasnovski/mini.comment',
        version = false,
        config = function()
            require('mini.comment').setup {
                mappings = {
                    comment = '<space>/',
                    comment_line = '<space>//',
                    comment_visual = '<space>/',
                    textobject = '<space>/',
                },
            }
        end,
    },
    {
        'max397574/better-escape.nvim',
        event = 'VeryLazy',
        config = true,
    },
}
