#
# Dockerfile for shadowsocks-libev
#

FROM centos:7
MAINTAINER NoBody

ENV SS_URL https://github.com/shadowsocks/shadowsocks-libev/releases/download/v3.1.1/shadowsocks-libev-3.1.1.tar.gz
ENV SS_DIR shadowsocks-libev-3.1.1

ENV SS_PORT 4334
ENV SS_MANAGER_PORT 4335

COPY . /root/ss-node

RUN set -ex \
  && yum install epel-release -y \
  && yum install gcc \
                 git \
                 gettext \
                 autoconf \
                 libtool \
                 automake \
                 make \
                 pcre-devel \
                 asciidoc \
                 xmlto \
                 c-ares-devel \
                 libev-devel \
                 libsodium-devel \
                 mbedtls-devel -y \
  #&& git clone https://github.com/jedisct1/libsodium.git \
  #&& cd libsodium/ \
  #&& ./autogen.sh \
  #&& ./configure \
  #&& make \
  #&& make install \
  #&& ldconfig \
  && curl -sSL https://github.com/shadowsocks/shadowsocks-libev/releases/download/v3.1.1/shadowsocks-libev-3.1.1.tar.gz | tar xz \
  && cd shadowsocks-libev-3.1.1 \
        && ./configure --disable-documentation \
        && make && make install \
        && cd .. \
        && rm -rf shadowsocks-libev-3.1.1 \
  && curl --silent --location https://rpm.nodesource.com/setup_9.x | bash - \
  && yum -y install nodejs \
  && cd root/ss-node/js-src && npm install \
  && mkdir ~/.ss-node

EXPOSE $SS_PORT/tcp
EXPOSE $SS_PORT/udp
EXPOSE $SS_MANAGER_PORT/tcp
EXPOSE $SS_MANAGER_PORT/udp


ENTRYPOINT ["~/ss-node/bin/ss-node"]
