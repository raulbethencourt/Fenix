local conform = require 'conform'

conform.setup {
  format = {
    timeout_ms = 5000,
    async = true, -- not recommended to change
    quiet = true, -- not recommended to change
  },
  formatters_by_ft = {
    sql = { 'sql_formatter' },
    rust = { 'rustfmt' },
    html = { 'prettier' },
    css = { 'prettier' },
    javascript = { 'prettier' },
    json = { 'prettier' },
    yaml = { 'prettier' },
    markdown = { 'prettier' },
    http = { 'prettier' },
    lua = { 'stylua' },
    sh = { 'shfmt' },
    bash = { 'shfmt' },
    zsh = { 'shfmt' },
    -- php = { 'phpcbf' },
    php = { 'pretty-php' },
  },
}
