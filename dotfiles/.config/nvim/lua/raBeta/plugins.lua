local fn = vim.fn

-- Automatically install packer
local install_path = fn.stdpath("data") .. "/site/pack/packer/start/packer.nvim"
if fn.empty(fn.glob(install_path)) > 0 then
    PACKER_BOOTSTRAP = fn.system({
        "git",
        "clone",
        "--depth",
        "1",
        "https://github.com/wbthomason/packer.nvim",
        install_path,
    })
    print("Installing packer close and reopen Neovim...")
    vim.cmd([[packadd packer.nvim]])
end

-- Autocommand that reloads neovim whenever you save the plugins.lua file
vim.cmd([[
  augroup packer_user_config
    autocmd!
    autocmd BufWritePost plugins.lua source <afile> | PackerSync
  augroup end
]])

-- Use a protected call so we don't error out on first use
local status_ok, packer = pcall(require, "packer")
if not status_ok then
    return
end

-- Have packer use a popup window
packer.init({
    max_jobs = 50,
    display = {
        open_fn = function()
            return require("packer.util").float({ border = "rounded" })
        end,
        prompt_border = "rounded", -- Border style of prompt popups.
    },
})

-- Install your plugins here
return packer.startup(function(use)
    -- My plugins here
    use "wbthomason/packer.nvim" -- Have packer manage itself
    use "mbbill/undotree"

    -- Lua Development
    use "nvim-lua/plenary.nvim" -- Useful lua functions used ny lots of plugins
    use "nvim-lua/popup.nvim"

    -- Coloscheme
    -- use "Shatur/neovim-ayu"
    -- use "wittyjudge/gruvbox-material.nvim"
    use({ "rose-pine/neovim",
        as = "rose-pine" })
    use "windwp/nvim-autopairs"

    use {
        'VonHeikemen/lsp-zero.nvim',
        requires = {
            -- LSP Support
            {'neovim/nvim-lspconfig'},
            {'williamboman/mason.nvim'},
            {'williamboman/mason-lspconfig.nvim'},

            -- Autocompletion
            {'hrsh7th/nvim-cmp'},
            {'hrsh7th/cmp-buffer'},
            {'hrsh7th/cmp-path'},
            {'saadparwaiz1/cmp_luasnip'},
            {'hrsh7th/cmp-nvim-lsp'},
            {'hrsh7th/cmp-nvim-lua'},

            -- Snippets
            {'L3MON4D3/LuaSnip'},
            {'rafamadriz/friendly-snippets'},
        }
    }
    -- Cmp
    use "hrsh7th/cmp-cmdline" -- path completions

    use 'jose-elias-alvarez/null-ls.nvim' -- LSP diagnostics and code actions

    -- Telescope
    use {
        'nvim-telescope/telescope.nvim', tag = '0.1.0',
        requires = { {'nvim-lua/plenary.nvim'} }
    }

    -- Syntax/Treesitter
    use {
        "nvim-treesitter/nvim-treesitter",
        {run = ":TSUpdate"},
    }

    -- comments
    use "numToStr/Comment.nvim" -- Easily comment stuff
    use "JoosepAlviste/nvim-ts-context-commentstring"

    --Git
    use "lewis6991/gitsigns.nvim"

    -- Automatically set up your configuration after cloning packer.nvim
    -- Put this at the end after all plugins
    if PACKER_BOOTSTRAP then
        require("packer").sync()
    end
end)
