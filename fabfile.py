#-*- coding:utf-8 -*-
#!/usr/bin/env python
import time
import json
from fabric.api import *
from fabric.colors import *

env.use_ssh_config = True
# with open('./shadowsocks/config.json') as json_file:
#     env.hosts = json.load(json_file)['hosts']


def uploadFiles(s, d):
    with settings(warn_only=True):
        result = put(s, d)
    if result.failed and not confirm("put tar file failed, Continue[Y/N]"):
        abort("aborting file put: %s-----%s" % (s, d))
    else:
        print green("Successfully put " + s + " to dir " + d)

def setFirewall():
  run('sudo iptables -F')

def uploadPackage():
  local('zip -r ./ss-node.zip .')
  with settings(warn_only=True):
    run('rm ~/ss-node.zip')
  uploadFiles('./ss-node.zip', '~/')
  local('rm ss-node.zip')
  run('rm -rf ~/ss-node')
  run('unzip ~/ss-node.zip -d ss-node && cd ~/ss-node')

def deploy():
    uploadPackage()
    run('cd ~/ss-node && docker build -t ss-node .')
    setFirewall()


def setup_server():
    run('sudo yum remove docker docker-common docker-selinux docker-engine -y \
      && sudo yum install -y yum-utils device-mapper-persistent-data lvm2 -y \
      && sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo \
      && sudo yum-config-manager --enable docker-ce-edge \
      && sudo yum-config-manager --enable docker-ce-test \
      && sudo yum makecache fast \
      && sudo yum install docker-ce -y \
      && sudo systemctl enable docker \
      && sudo systemctl start docker \
      && sudo usermod -aG docker root \
      && sudo yum install unzip -y')

