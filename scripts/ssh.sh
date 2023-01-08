#!/bin/bash
# find /tmp/.ssh -name "" -exec rm -rf {} \;

mkdir /tmp/.ssh

ssh-keygen -t rsa -b 4096 -f /tmp/.ssh/sshkey -q -N ""

# ssh-copy-id sheena@192.168.0.11: