local dap = require 'dap'
local mason_path = vim.fn.glob(vim.fn.stdpath 'data' .. '/mason/')

dap.adapters.php = {
    type = 'executable',
    command = 'node',
    args = { mason_path .. 'packages/php-debug-adapter/extension/out/phpDebug.js' },
}

-- local path = '/var/www/html/'
local path = '/shared/httpd/portal/www/'

dap.configurations.php = {
    {
        name = 'Listen for Xdebug',
        type = 'php',
        request = 'launch',
        port = 9000,
        pathMappings = {
            [path] = "${workspaceFolder}",
        },
    },
    {
        name = 'Debug currently open script',
        type = 'php',
        request = 'launch',
        port = 9000,
        cwd = '${fileDirname}',
        program = '${file}',
        runtimeExecutable = 'php',
        pathMappings = {
            [path] = "${workspaceFolder}",
        },
    },
}
