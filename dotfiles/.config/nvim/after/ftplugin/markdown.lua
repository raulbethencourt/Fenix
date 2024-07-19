local options = {
    shiftwidth = 2, -- the number of spaces inserted for each indentation
    tabstop = 2,    -- the number of spaces inserted for a tab
}
for k, v in pairs(options) do
    vim.opt[k] = v
end
