if (vim.g.vscode) then
    -- Basic Key Mappings vscode
    local mappings = {
        [[imap <C-h> <C-w>h]],
        [[imap <C-j> <C-w>j]],
        [[imap <C-k> <C-w>k]],
        [[imap <C-l> <C-w>l]],

        [[nmap <C-d> <C-d>zz]],
        [[nmap <C-u> <C-u>zz]],
        
        -- whichkey mappings
        [[map <Space> <Leader>]],
        [[let mapleader="\<space>"]],

        -- Better indenting
        [[vnoremap < <gv]],
        [[vnoremap > >gv]],

        -- Simulate same TAB behavior in VSCode
        [[nmap <Tab> :Tabnext<CR>]],
        [[nmap <S-Tab> :Tabprev<CR>]],
    }

    for i, v in ipairs(mappings) do
        vim.cmd(v)
    end
end
