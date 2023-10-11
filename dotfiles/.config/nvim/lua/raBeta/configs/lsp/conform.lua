local conform = require 'conform'

conform.setup {
  formatters_by_ft = {
    sql = { 'sql_formatter' },
    rust = { 'rustfmt' },
    html = { 'prettier' },
    css = { 'prettier' },
    javascript = { 'prettier' },
    json = { 'prettier' },
    yaml = { 'prettier' },
    markdown = { 'prettier' },
    lua = { 'stylua' },
    sh = { 'shfmt' },
    bash = { 'shfmt' },
    zsh = { 'shfmt' },
    php = { 'php_cs_fixer' },
    ['*'] = { 'codespell' },
  },
}
