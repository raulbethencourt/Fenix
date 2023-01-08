local M = {}

M.general = {
  n = {
    [";"] = { ":", "enter command mode", opts = { nowait = true } },
    ["<leader>w"] = { "<cmd> w <CR>", "save file" },
    ["<leader>v"] = { "<cmd> vsplit <CR>", "vertical split" },
    ["<leader>n"] = { "<cmd> noh <CR>", "no highlight" },
  },
}

M.tabufline = {
  n = {
    ["<leader>c"] = {
      function()
        require("nvchad_ui.tabufline").close_buffer()
      end,
      "close buffer",
    },
  },
}

M.nvimtree = {
  n = {
    ["<leader>e"] = { "<cmd> NvimTreeToggle <CR>", "   toggle nvimtree" },
    ["<C-n>"] = { "<cmd> Telescope <CR>", "open telescope" },
  },
}

M.lspconfig = {
  n = {
    ["<leader>lf"] = {
      function()
        vim.lsp.buf.format { async = true }
      end,
      "lsp formatting",
    },
  },
}
return M
