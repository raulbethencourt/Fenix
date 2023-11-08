let SessionLoad = 1
let s:so_save = &g:so | let s:siso_save = &g:siso | setg so=0 siso=0 | setl so=-1 siso=-1
let v:this_session=expand("<sfile>:p")
silent only
silent tabonly
cd ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
let s:shortmess_save = &shortmess
if &shortmess =~ 'A'
  set shortmess=aoOA
else
  set shortmess=aoO
endif
badd +2 snippets/php.code-snippets
badd +2 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/vardump.code-snippets
badd +2 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/beans.code-snippets
badd +2 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/calls.code-snippets
badd +2 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/functions.code-snippets
badd +2 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/queries.code-snippets
badd +22 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/tcpdf.code-snippets
badd +1 ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/todos.code-snippets
argglobal
%argdel
$argadd snippets/php.code-snippets
edit ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/vardump.code-snippets
wincmd t
let s:save_winminheight = &winminheight
let s:save_winminwidth = &winminwidth
set winminheight=0
set winheight=1
set winminwidth=0
set winwidth=1
argglobal
balt ~/.vscode/extensions/raulbeta.bns-snippets-0.0.4/snippets/todos.code-snippets
let s:l = 2 - ((1 * winheight(0) + 40) / 80)
if s:l < 1 | let s:l = 1 | endif
keepjumps exe s:l
normal! zt
keepjumps 2
normal! 02|
tabnext 1
if exists('s:wipebuf') && len(win_findbuf(s:wipebuf)) == 0 && getbufvar(s:wipebuf, '&buftype') isnot# 'terminal'
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20
let &shortmess = s:shortmess_save
let &winminheight = s:save_winminheight
let &winminwidth = s:save_winminwidth
let s:sx = expand("<sfile>:p:r")."x.vim"
if filereadable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &g:so = s:so_save | let &g:siso = s:siso_save
nohlsearch
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
