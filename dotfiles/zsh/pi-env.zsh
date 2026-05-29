# pi-env.zsh
# Minimal zsh environment for pi agent bash tool.
# Sources exports, PATH, and aliases — skips interactive-only stuff
# (compinit, zle bindings, ssh-add, starship, zoxide, fzf shell integration).

# ── Core exports ──────────────────────────────────────────────────────────────
export GIT_EDITOR="nvim"
export EDITOR="nvim"
export GOPATH="$HOME/go"
export GOOS="linux"
export GOARCH="amd64"
export PYENV_ROOT="$HOME/.pyenv"
export SCRIPTSPATH="$HOME/shelltools"
export RIPGREP_CONFIG_PATH="$HOME/.ripgreprc"
export OPENCODE_PORT=4096
export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/ssh-agent.socket"
export MANPAGER="sh -c 'col -bx | bat -l man -p'"
export BUN_INSTALL="$HOME/.bun"

# BNS
export BNS_USER="raul-bns"
export BNS_TOOLS="$HOME/dev/bns/tools"
export POSTING_COLLECTIONS_ROOT="$HOME/posting"
export LOGINPATH="dockerroot"
export SSH_USER="raul-bns"

# ── PATH ──────────────────────────────────────────────────────────────────────
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.fzf/bin:$PATH"
export PATH="$HOME/.local/share/nvim:$PATH"
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
export PATH="$PYENV_ROOT/bin:$PATH"
export PATH="$PATH:$HOME/.composer/vendor/bin"
export PATH="$PATH:/usr/local/go/bin"
export PATH="$PATH:$GOPATH/bin"
export PATH="$PATH:$HOME/apps/zig-linux-x86_64-0.13.0/zig"
export PATH="$PATH:$HOME/apps/nerd-dictation"
export PATH="$PATH:$SCRIPTSPATH/bin"
export PATH="$PATH:$HOME/.opencode/bin"
export PATH="$PATH:$HOME/.local/share/gem/ruby/3.4.0/bin"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/dev/bns/tools/bin:$PATH"
export PATH="$HOME/dev/bnstools/tools/scripts:$PATH"

# ── Cargo ─────────────────────────────────────────────────────────────────────
[[ -f "$HOME/.cargo/env" ]] && . "$HOME/.cargo/env"

# ── NVM ───────────────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.config/nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"

# ── Pyenv ─────────────────────────────────────────────────────────────────────
if command -v pyenv &>/dev/null; then
  eval "$(pyenv init -)"
fi

# ── Aliases ───────────────────────────────────────────────────────────────────
[[ -f "$HOME/zsh/alias/general.zsh" ]] && source "$HOME/zsh/alias/general.zsh"
[[ -f "$HOME/zsh/alias/git.zsh" ]]     && source "$HOME/zsh/alias/git.zsh"
[[ -f "$HOME/zsh/alias/ubuntu.zsh" ]]  && source "$HOME/zsh/alias/ubuntu.zsh"
[[ -f "$HOME/zsh/alias/docker.zsh" ]]  && source "$HOME/zsh/alias/docker.zsh"
[[ -f "$HOME/zsh/alias/bns.zsh" ]]     && source "$HOME/zsh/alias/bns.zsh"

# eza wrappers: default to '.' when no path given (eza -lA without a path
# outputs nothing in non-TTY mode — pi's bash tool is not a TTY)
# Unalias first so the function takes precedence over the alias from general.zsh
unalias l lt 2>/dev/null
function l()  { eza -lA  --changed --icons=always "${@:-.}"; }
function lt() { eza -lAT --changed --icons=always "${@:-.}"; }

# ── BNS functions (from extras.zsh, without ssh-add / ssh config rewrite) ────
function databases() {
  mysql --login-path="$LOGINPATH" -Nse "show databases;"
}

function sql() {
  local db_name="$1"
  [[ -z "$db_name" ]] && { echo 'db_name not found.'; return 2; }
  mysql --login-path="$LOGINPATH" "$db_name" -se "$2"
}

# BNS autocompletion (safe — only loads if the file exists)
if [[ -f "$HOME/dev/bns/tools/bin/.autocompletion" ]]; then
  autoload bashcompinit && bashcompinit 2>/dev/null
  . "$HOME/dev/bns/tools/bin/.autocompletion" 2>/dev/null
fi
