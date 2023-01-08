-- Use which-key to add extra bindings with the leader-key prefix
lvim.builtin.which_key.timeoutlen = 100
lvim.builtin.which_key.setup = {
    layout = {
        height = { min = 4, max = 25 }, -- min and max height of the columns
        width = { min = 20, max = 50 }, -- min and max width of the columns
        spacing = 3, -- spacing between columns
        align = "center", -- align columns left, center or right
    },
    icons = {
        breadcrumb = "»", -- symbol used in the command line area that shows your active key combo
        separator = "➜", -- symbol used between a key and it's label
        group = "+", -- symbol prepended to a group
    },
    window = {
        border = "rounded", -- none, single, double, shadow
        position = "bottom", -- bottom, top
        margin = { 1, 30, 2, 30 }, -- extra window margin [top, right, bottom, left]
        padding = { 2, 1, 2, 1 }, -- extra window padding [top, right, bottom, left]
        winblend = 0,
    },
    ignore_missing = true, -- enable this to hide mappings for which you didn't specify a label
}
lvim.builtin.which_key.mappings["v"] = { "<cmd>vsplit<cr>", "vsplit" }
lvim.builtin.which_key.mappings["o"] = {
    name = "Replace",
    r = { "<cmd>lua require('spectre').open()<cr>", "Replace" },
    f = { "<cmd>lua require('spectre').open_file_search()<cr>", "Replace Buffer" },
    w = { "<cmd>lua require('spectre').open_visual({select_word=true})<cr>", "Replace Word" },
}
lvim.builtin.which_key.mappings["r"] = {
    "<cmd>RnvimrToggle<CR>", "Ranger"
}
lvim.builtin.which_key.mappings["t"] = {
    name = "Terminal",
    f = { "<cmd>ToggleTerm direction=float<cr>", "Float" },
    h = { "<cmd>ToggleTerm size=10 direction=horizontal<cr>", "Horizontal" },
    v = { "<cmd>ToggleTerm size=80 direction=vertical<cr>", "Vertical" },
}
lvim.builtin.which_key.mappings["x"] = {
    name = "Trouble",
    x = { "<cmd>TroubleToggle<cr>", "trouble" },
    w = { "<cmd>TroubleToggle workspace_diagnostics<cr>", "workspace" },
    d = { "<cmd>TroubleToggle document_diagnostics<cr>", "document" },
    q = { "<cmd>TroubleToggle quickfix<cr>", "quickfix" },
    l = { "<cmd>TroubleToggle loclist<cr>", "loclist" },
    r = { "<cmd>TroubleToggle lsp_references<cr>", "references" },
}
lvim.builtin.which_key.mappings["P"] = { "<cmd>Telescope projects<CR>", "Projects" }

-- alpha
lvim.builtin.alpha.active = true
lvim.builtin.alpha.mode = "dashboard"
lvim.builtin.alpha.dashboard.section.header.val = {
    [[                   __     __ __              ]],
    [[                  |  \   |  \  \             ]],
    [[  ______   ______ | ▓▓   | ▓▓\▓▓______ ____  ]],
    [[ /      \ |      \| ▓▓   | ▓▓  \      \    \ ]],
    [[|  ▓▓▓▓▓▓\ \▓▓▓▓▓▓\\▓▓\ /  ▓▓ ▓▓ ▓▓▓▓▓▓\▓▓▓▓\]],
    [[| ▓▓   \▓▓/      ▓▓ \▓▓\  ▓▓| ▓▓ ▓▓ | ▓▓ | ▓▓]],
    [[| ▓▓     |  ▓▓▓▓▓▓▓  \▓▓ ▓▓ | ▓▓ ▓▓ | ▓▓ | ▓▓]],
    [[| ▓▓      \▓▓    ▓▓   \▓▓▓  | ▓▓ ▓▓ | ▓▓ | ▓▓]],
    [[ \▓▓       \▓▓▓▓▓▓▓    \▓    \▓▓\▓▓  \▓▓  \▓▓]],

    --   "  8 888888888o.            .8. `8.`888b           ,8'  8 8888          ,8.       ,8.",
    --   "  8 8888    `88.          .888. `8.`888b         ,8'   8 8888         ,888.     ,888.",
    --   "  8 8888     `88         :88888. `8.`888b       ,8'    8 8888        .`8888.   .`8888.",
    --   "  8 8888     ,88        . `88888. `8.`888b     ,8'     8 8888       ,8.`8888. ,8.`8888.",
    --   "  8 8888.   ,88'       .8. `88888. `8.`888b   ,8'      8 8888      ,8'8.`8888,8^8.`8888.",
    --   "  8 888888888P'       .8`8. `88888. `8.`888b ,8'       8 8888     ,8' `8.`8888' `8.`8888.",
    --   "  8 8888`8b          .8' `8. `88888. `8.`888b8'        8 8888    ,8'   `8.`88'   `8.`8888.",
    --   "  8 8888 `8b.       .8'   `8. `88888. `8.`888'         8 8888   ,8'     `8.`'     `8.`8888.",
    --   "  8 8888   `8b.    .888888888. `88888. `8.`8'          8 8888  ,8'       `8        `8.`8888.",
    --   "  8 8888     `88. .8'       `8. `88888. `8.`           8 8888 ,8'         `         `8.`8888.",
}


