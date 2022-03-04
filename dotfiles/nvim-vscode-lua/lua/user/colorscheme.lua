vim.g.gruvbox_material_background = "hard"
vim.g.gruvbox_marerial_ui_contrast = "high"
vim.g.gruvbox_marerial_palette = "material"

local colorscheme = "gruvbox-material"

local status_ok, _ = pcall(vim.cmd, "colorscheme " .. colorscheme)
if not status_ok then
  vim.notify("colorscheme " .. colorscheme .. " not found!")
  return
end
