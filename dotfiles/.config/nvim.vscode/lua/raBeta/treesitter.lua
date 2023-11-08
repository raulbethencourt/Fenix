local status_ok, configs = pcall(require, "nvim-treesitter.configs")
if not status_ok then
	return
end

configs.setup({
    ensure_installed = { "bash", "c", "javascript", "json", "lua", "python", "typescript", "vue", "css", "rust", "rust", "yaml", "markdown", "markdown_inline" }, -- one of "all" or a list of languages
    sync_install =  false,
    auto_install = true,
	ignore_install = { "phpdoc" }, -- List of parsers to ignore installing
	highlight = {
		enable = true, -- false will disable the whole extension
		disable = { "css" }, -- list of language that will be disabled
	},
	autopairs = {
		enable = true,
	},
	indent = { enable = true, disable = { "python", "css", "yaml" } },
    context_commentstring = {
        enable = true,
        enable_autocmd = false,
    },
})
