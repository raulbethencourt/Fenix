" NOTE: plugins are installed via vim-plug for vscode
if empty(glob('~/.config/nvim/autoload/plug.vim'))
  silent !curl -fLo ~/.config/nvim/autoload/plug.vim --create-dirs
    \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
  autocmd VimEnter * PlugInstall | source $MYVIMRC
endif

call plug#begin('~/.config/nvim/autoload/plugged')

    Plug 'tpope/vim-commentary'
    Plug 'tpope/vim-speeddating'
    Plug 'glts/vim-radical'
    Plug 'tpope/vim-repeat'
    Plug 'unblevable/quick-scope'
    Plug 'suy/vim-context-commentstring'
    Plug 'phaazon/hop.nvim'
    Plug 'machakann/vim-highlightedyank'
    Plug 'kylechui/nvim-surround'

call plug#end()

autocmd VimEnter *
  \  if len(filter(values(g:plugs), '!isdirectory(v:val.dir)'))
  \|   PlugInstall --sync | q
  \| endif
