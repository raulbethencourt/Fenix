return {
    -- Coloscheme
    "Shatur/neovim-ayu",
    "wittyjudge/gruvbox-material.nvim",
    {
        'eddyekofo94/gruvbox-flat.nvim',
        lazy = false,
        priority = 1000,
        config = function()
            vim.g.gruvbox_flat_style = "hard"
            vim.cmd([[colorscheme gruvbox-flat]])
        end
    },
}
