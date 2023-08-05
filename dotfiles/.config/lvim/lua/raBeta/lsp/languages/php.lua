local lsp_manager = require("lvim.lsp.manager")
lsp_manager.setup("intelephense")

local get_intelephense_license = function()
	local f = assert(io.open(os.getenv("HOME") .. "/intelephense/license.txt", "rb"))
	local content = f:read("*a")
	f:close()
	return string.gsub(content, "%s+", "")
end

local on_attach = function(client, buffer)
	require("lsp_signature").on_attach()
end

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.completion.completionItem.snippetSupport = true
capabilities.textDocument.completion.completionItem.resolveSupport = {
	properties = {
		"documentation",
		"detail",
		"additionalTextEdits",
	},
}

require("lspconfig").intelephense.setup({
	capabilities = capabilities,
	on_attach = on_attach,
	init_options = {
		licenceKey = get_intelephense_license(),
	},
})

local dap = require("dap")
local mason_path = vim.fn.glob(vim.fn.stdpath("data") .. "/mason/")
dap.adapters.php = {
	type = "executable",
	command = "node",
	args = { mason_path .. "packages/php-debug-adapter/extension/out/phpDebug.js" },
}
dap.configurations.php = {
	{
		name = "Listen for Xdebug",
		type = "php",
		request = "launch",
		port = 9003,
	},
	{
		name = "Debug currently open script",
		type = "php",
		request = "launch",
		port = 9003,
		cwd = "${fileDirname}",
		program = "${file}",
		runtimeExecutable = "php",
	},
}

-- Use the PHP binary to lookup documentation.
vim.opt.keywordprg = "php --rf"

-- Use phpcs linter.
vim.cmd("compiler phpcs")

-- LSP.
-- See https://github.com/bmewburn/intelephense-docs
local lsp_path = "/home/rabeta/.local/share/lvim/mason/bin/intelephense"
if vim.fn.filereadable(lsp_path) == 1 then
	vim.lsp.start({
		name = "intelephense",
		cmd = { "intelephense", "--stdio" },
		root_dir = vim.fs.dirname(vim.fs.find({ "composer.json", "index.php", ".git" })[1]),
	})
	-- The settings only work by putting the licence key in
	-- ~/intelephense/licence.txt. Note the UK spelling.
end

-- vim:fdm=marker ft=lua et sts=4 sw=4
