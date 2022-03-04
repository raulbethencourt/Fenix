local status_ok, dial = pcall(require, "dial")
if not status_ok then
  return
end

vim.cmd [[
  nmap <C-a> <Plug>(dial-increment)
  nmap <C-x> <Plug>(dial-decrement)
  vmap <C-a> <Plug>(dial-increment)
  vmap <C-x> <Plug>(dial-decrement)
  vmap g<C-a> <Plug>(dial-increment-additional)
  vmap g<C-x> <Plug>(dial-decrement-additional)
  ]]

dial.config.augends:register_group {
  default = {
    dial.augend.integer.alias.decimal,
    dial.augend.integer.alias.hex,
    dial.augend.date.alias["%Y/%m/%d"],
  },
  typescript = {
    dial.augend.integer.alias.decimal,
    dial.augend.integer.alias.hex,
    dial.augend.constant.new { elements = { "let", "const" } },
  },
  visual = {
    dial.augend.integer.alias.decimal,
    dial.augend.integer.alias.hex,
    dial.augend.date.alias["%Y/%m/%d"],
    dial.augend.constant.alias.alpha,
    dial.augend.constant.alias.Alpha,
  },
}
