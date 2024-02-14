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
    build = function()
      vim.fn['mkdp#util#install']()
    end,
    config = function()
      vim.g.mkdp_browser = '/usr/bin/vivaldi'
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
