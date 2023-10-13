local lint = require 'lint'

lint.linters_by_ft = {
  javascript = { 'eslint_d', 'codespell' },
  markdown = { 'markdownlint', 'codespell' },
  php = { 'phpcs' },
  -- php = { 'phpstan' },
  sh = { 'shellcheck', 'codespell' },
  bash = { 'shellcheck', 'codespell' },
  zsh = { 'shellcheck', 'codespell' },
}

local lint_augroup = vim.api.nvim_create_augroup('lint', {
  clear = true,
})

vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWritePost' }, {
  group = lint_augroup,
  callback = function()
    lint.try_lint()
  end,
})
