return {
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
    'iamcco/markdown-preview.nvim',
    cmd = { 'MarkdownPreviewToggle', 'MarkdownPreview', 'MarkdownPreviewStop' },
    ft = { 'markdown' },
    build = 'cd app && npm install',
    config = function()
      vim.g.mkdp_filetypes = { 'markdown' }
      vim.g.mkdp_browser = '/usr/bin/vivaldi'
      vim.keymap.set('n', '<leader>mp', ':MarkdownPreviewToggle <CR>', {})
    end,
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
