return {
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
