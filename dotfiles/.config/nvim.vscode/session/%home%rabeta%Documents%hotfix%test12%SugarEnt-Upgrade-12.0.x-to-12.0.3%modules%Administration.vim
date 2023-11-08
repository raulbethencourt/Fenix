let SessionLoad = 1
let s:so_save = &g:so | let s:siso_save = &g:siso | setg so=0 siso=0 | setl so=-1 siso=-1
let v:this_session=expand("<sfile>:p")
silent only
silent tabonly
cd ~/Documents/hotfix/test12/SugarEnt-Upgrade-12.0.x-to-12.0.3/modules/Administration
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
let s:shortmess_save = &shortmess
if &shortmess =~ 'A'
  set shortmess=aoOA
else
  set shortmess=aoO
endif
badd +31 Upgrade.php
badd +44 ~/Documents/hotfix/test12/SugarEnt-Upgrade-12.0.x-to-12.0.3/modules/Administration/RepairJSFile.php
badd +128 ~/Documents/hotfix/test12/SugarEnt-Upgrade-12.0.x-to-12.0.3/modules/Administration/clients/base/views/drive-path-records/drive-path-records.js
badd +9 ~/Documents/hotfix/test12/SugarEnt-Upgrade-12.0.x-to-12.0.3/modules/Administration/clients/base/layouts/maps-controls/maps-controls.js
badd +59 ~/Documents/hotfix/test12/SugarEnt-Upgrade-12.0.x-to-12.0.3/modules/Administration/clients/base/api/AdministrationApi.php
argglobal
%argdel
$argadd Upgrade.php
wincmd t
let s:save_winminheight = &winminheight
let s:save_winminwidth = &winminwidth
set winminheight=0
set winheight=1
set winminwidth=0
set winwidth=1
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
