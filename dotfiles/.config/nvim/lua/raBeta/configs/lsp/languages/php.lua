local dap = require 'dap'
local mason_path = vim.fn.glob(vim.fn.stdpath 'data' .. '/mason/')

dap.adapters.php = {
    type = 'executable',
    command = 'node',
    args = { mason_path .. 'packages/php-debug-adapter/extension/out/phpDebug.js' },
}

dap.configurations.php = {
    {
        name = 'Listen for Xdebug',
        type = 'php',
        request = 'launch',
        port = 9000,
        pathMappings = { ['/var/www/html/'] = "${workspaceFolder}" },
    },
    {
        name = 'Debug currently open script',
        type = 'php',
        request = 'launch',
        port = 9000,
        cwd = '${fileDirname}',
        program = '${file}',
        runtimeExecutable = 'php',
        pathMappings = { ['/var/www/html/'] = "${workspaceFolder}" },
    },
}

-- NOTE: Set Xdebug path with keybinding
vim.keymap.set('n', '<leader>dp', function()
    local path = (dap.configurations.php[1].pathMappings['/var/www/html/'] ~= nil and
        { ['/shared/httpd/portal/www/'] = "${workspaceFolder}" } or
        { ['/var/www/html/'] = "${workspaceFolder}" })

    ---@diagnostic disable-next-line: inject-field
    dap.configurations.php[2].pathMappings = path
    ---@diagnostic disable-next-line: inject-field
    dap.configurations.php[1].pathMappings = path

    print('The workspaceFolder path is: ' .. string.gsub(vim.inspect(path), '\n', ' '))
end
, { noremap = true, silent = true, desc = 'Set Xdebug [P]ath' })
