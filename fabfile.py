#-*- coding:utf-8 -*-
#!/usr/bin/env python
import time
import json
from fabric.api import *
from fabric.colors import *

env.use_ssh_config = True
with open('./shadowsocks/config.json') as json_file:
    env.hosts = json.load(json_file)['hosts']


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
  local('zip -r ./shadowsocks.zip ./shadowsocks')
  with settings(warn_only=True):
    run('rm ~/shadowsocks.zip')
  uploadFiles('./shadowsocks.zip', '~/')
  local('rm shadowsocks.zip')
  run('rm -rf ~/shadowsocks')
  run('unzip ~/shadowsocks.zip && cd ~/shadowsocks')

def deploy_ss_node():
    uploadPackage()
    run('mv ~/shadowsocks/Dockerfiles/ss/Dockerfile ~/shadowsocks/Dockerfile && cd ~/shadowsocks \
      && docker build -t shadowsocks .')
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

