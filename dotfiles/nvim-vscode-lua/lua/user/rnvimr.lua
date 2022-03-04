local status_ok, rnvimr = pcall(require, "rnvimr")
if not status_ok then
   return
end

vim.g.rnvimr_draw_border = 1
vim.g.rnvimr_pick_enable = 1
vim.g.rnvimr_bw_enable = 1

