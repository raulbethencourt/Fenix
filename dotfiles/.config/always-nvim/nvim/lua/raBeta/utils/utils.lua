M = {}

-- NOTE: code to debug table
-- print(vim.inspect())
-- vim.notify(vim.inspect())

---Return a floating window
---@param opts? {[any]?:integer}
---@return [any]
---
M.create_floting_win = function(opts)
    opts = opts or {}

    -- Create an immutable scratch buffer that is wiped once hidden
    local buf = nil
    opts.buf = opts.buf or -1
    if vim.api.nvim_buf_is_valid(opts.buf) then
        buf = opts.buf
    else
        buf = vim.api.nvim_create_buf(false, true)
    end

    -- Create a floating window using the scratch buffer postioned in the middle
    local height = opts.height or math.ceil(vim.o.lines * 0.9) -- 90% of screen height
    local width = opts.width or math.ceil(vim.o.columns * 0.9) -- 90% of screen width
    local row = math.ceil((vim.o.lines - height) / 2)
    local col = math.ceil((vim.o.columns - width) / 2)

    ---@diagnostic disable-next-line: param-type-mismatch
    local win = vim.api.nvim_open_win(buf, true, {
        style = opts.style or 'minimal',
        relative = 'editor',
        width = width,
        height = height,
        row = row,
        col = col,
        border = opts.border or 'rounded',
    })
    return { buf = buf, win = win }
end

---Lounch cmd in popup window
---@param cmd string|string[]
---@param opts? {win?:integer}
---@return nil
---
M.launch_cmd_in_floating_win = function(cmd, opts)
    opts = opts or {}

    -- Create window to open term
    local win = require('raBeta.utils.utils').create_floting_win(opts.win or opts)

    -- Change to the window that is floating to ensure termopen uses correct size
    vim.api.nvim_set_current_win(win.win)

    -- Launch cmd in term
    vim.fn.jobstart(cmd, {
        term = true,
        on_exit = function(_, _, _)
            ---@diagnostic disable-next-line: undefined-field
            if opts.close_term == true then
                if vim.api.nvim_win_is_valid(win.win) then
                    vim.api.nvim_win_close(win.win, true)
                end
            end
        end,
    })

    -- Start in terminal mode
    vim.cmd.startinsert()
end

---Launch cmd in popup window using dependencies cmds
---@param cmd string|string[]
---@param dependencies {[any]:string}
---@return nil
---
M.launch_cmd_with_dependencies = function(cmd, dependencies)
    ---@diagnostic disable-next-line: unused-local
    for i, dependencie in pairs(dependencies) do
        local dependencie_response = vim.fn.system(dependencie)

        if dependencie_response:match 'command not found' then
            vim.notify(vim.fn.toupper(dependencie) .. ' is not installed. You need to install it to make keymap works.', 4)
            return
        end
    end

    M.launch_cmd_in_floating_win(cmd, { close_term = true })
end

---Creates alias for keymaps
---@param mode string|string[]
---@param keys string
---@param func string|function
---@param desc? string?
---@return nil
---
M.keymap = function(mode, keys, func, desc)
    if not desc or string.len(desc) == 0 then
        desc = 'keymap'
    end

    vim.keymap.set(mode, keys, func, { noremap = true, silent = true, desc = desc })
end

---Formats visual selection only
---@return nil
---
M.visual_format = function()
    vim.lsp.buf.format {
        async = true,
        range = {
            ['start'] = vim.api.nvim_buf_get_mark(0, '<'),
            ['end'] = vim.api.nvim_buf_get_mark(0, '>'),
        },
    }
end

return M
