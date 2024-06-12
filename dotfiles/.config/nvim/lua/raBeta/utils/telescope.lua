local prompt_style = function(layout)
    layout.prompt.title = ''
    layout.prompt.borderchars = { '─', '│', '─', '│', '╭', '╮', '╯', '╰' }

    layout.results.title = ''
    layout.results.borderchars = { '─', '│', '─', '│', '╭', '╮', '╯', '╰' }

    if layout.preview then
        layout.preview.title = ''
        layout.preview.borderchars = { '─', '│', '─', '│', '╭', '╮', '╯', '╰' }
    end

    return layout
end

require('telescope.pickers.layout_strategies').horizontal_no_titles = function(picker, max_columns, max_lines, layout_config)
    local layout = require('telescope.pickers.layout_strategies').horizontal(picker, max_columns, max_lines,
        layout_config)
    return prompt_style(layout)
end

require('telescope.pickers.layout_strategies').vertical_no_titles = function(picker, max_columns, max_lines, layout_config)
    local layout = require('telescope.pickers.layout_strategies').vertical(picker, max_columns, max_lines,
        layout_config)
    return prompt_style(layout)
end
