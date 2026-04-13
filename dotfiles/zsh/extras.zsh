# Constantes
export BNS_USER="raul-bns"
export BNS_TOOLS="$HOME/dev/bns/tools"
export POSTING_COLLECTIONS_ROOT="$HOME/posting"
export LOGINPATH="dockerroot"

# Show list of databases
databases() {
    mysql --login-path="$LOGINPATH" -Nse "show databases;"
}

# Runs a query for the current sugar app.
#e.g.
# sql af2a12 'SELECT count(*) FROM accounts'
sql() {
    db_name="$1"

    [ -z "$db_name" ] && {
        echo 'db_name not found.'
        exit 2
    }

    mysql --login-path="$LOGINPATH" "$db_name" -se "$2"
}

# Paths
export PATH="$HOME/dev/bns/tools/bin:$PATH"
export PATH="$HOME/dev/bnstools/tools/scripts:$PATH"

# Alias
source /home/rabeta/zsh/alias/bns.zsh

# Change user name in ssh/config file
export SSH_USER="raul-bns"
cat ~/.ssh/config.tmp | sed -e "s/\${SSH_USER}/${SSH_USER}/g" >~/.ssh/config

. ~/dev/bns/tools/bin/.autocompletion
