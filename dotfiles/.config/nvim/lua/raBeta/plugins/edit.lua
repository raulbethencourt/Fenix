local keymap = function(mode, keys, func, desc)
    if desc then
        desc = desc
    end

    vim.keymap.set(mode, keys, func, { noremap = true, silent = true, desc = desc })
end

return {
    {
        "epwalsh/obsidian.nvim",
        version = "*", -- recommended, use latest release instead of latest commit
        lazy = true,
        ft = "markdown",
        dependencies = {
            "nvim-lua/plenary.nvim",
            "nvim-telescope/telescope.nvim",
            "nvim-treesitter/nvim-treesitter",
        },
        config = function()
            require("obsidian").setup({
                workspaces = {
                    {
                        name = "personal",
                        path = "~/vaults/personal",
                    },
                    {
                        name = "work",
                        path = "~/vaults/work",
                    },
                },
                mappings = {
                    ["<leader>oh"] = {
                        action = function()
                            return require("obsidian").util.toggle_checkbox()
                        end,
                        opts = { buffer = true, silent = true, desc = '[O]bsidian toggle c[H]eckbox' },
                    },
                },
            })
            keymap('n', '<leader>os', '<cmd>ObsidianQuickSwitch<CR>', '[O]bsidian quick [S]witch')
            keymap('n', '<leader>ob', '<cmd>ObsidianBacklinks<CR>', '[O]bsidian [B]ack links')
            keymap('n', '<leader>ot', '<cmd>ObsidianTags<CR>', '[O]bsidian [T]ags')
            keymap('n', '<leader>oi', '<cmd>ObsidianPasteImg<CR>', '[O]bsidian paste [I]mage')
            keymap('n', '<leader>ow', '<cmd>ObsidianWorkspace<CR>', '[O]bsidian [W]orkspace')
            keymap('n', '<leader>oo', '<cmd>ObsidianOpen<CR>', '[O]bsidian [O]pen')
            keymap('n', '<leader>oe', '<cmd>ObsidianTemplate<CR>', '[O]bsidian t[E]mplate')
        end
    },
    {
        "chrisgrieser/nvim-recorder",
        dependencies = "rcarriga/nvim-notify",
        keys = {
            -- these must match the keys in the mapping config below
            { "q", desc = " Start Recording" },
            { "Q", desc = " Play Recording" },
            { "<C-q>", desc = " Switch Slot" },
            { "cq", desc = " Edit Macro" },
            { "dq", desc = " Delete Macro" },
            { "yq", desc = " Yank Macro" },
        },
        config = function()
            ---@diagnostic disable-next-line: missing-fields
            require("recorder").setup({
                slots = { "a", "b" },
                ---@diagnostic disable-next-line: missing-fields
                mapping = {
                    startStopRecording = "q",
                    playMacro = "Q",
                    switchSlot = "<C-q>",
                    editMacro = "cq",
                    deleteAllMacros = "dq",
                    yankMacro = "yq",
                },
            })
        end,
    },
    {
        'folke/todo-comments.nvim',
        event = 'BufRead',
        config = true,
    },
    {
        'kylechui/nvim-surround',
        config = true,
    },
    {
        'numToStr/Comment.nvim',
        opts = true,
        lazy = false,
    },
    {
        'max397574/better-escape.nvim',
        config = true,
    },
}
