return {
  -- {
  --   "windwp/nvim-ts-autotag",
  --   config = function()
  --     require("nvim-ts-autotag").setup()
  --   end,
  -- },
  -- {
  --   "mg979/vim-visual-multi",
  --   branch = "master",
  --   event = "VeryLazy",
  -- },
  {
    "folke/todo-comments.nvim",
    event = "BufRead",
    config = true,
  },
  {
    "kylechui/nvim-surround",
    config = true,
  },
  {
    "windwp/nvim-autopairs",
    -- Optional dependency
    dependencies = { 'hrsh7th/nvim-cmp' },
    config = function()
      require("nvim-autopairs").setup {}
      -- If you want to automatically add `(` after selecting a function or method
      local cmp_autopairs = require('nvim-autopairs.completion.cmp')
      local cmp = require('cmp')
      cmp.event:on(
        'confirm_done',
        cmp_autopairs.on_confirm_done()
      )
    end,
  },
}
