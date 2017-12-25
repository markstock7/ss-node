package main

import (
  "fmt"
  "os/exec"
  "io/ioutil"
  "gopkg.in/yaml.v2"
  "ss-node/utils"
  "ss-node/server"
  "ss-node/conf"
  "ss-node/shadowsocks"
)


func main() {

  fmt.Println("Hello world.")

  // 解析配置文件
  config := conf.Config{}

  yamlFile, err := ioutil.ReadFile("conf.yml")
  utils.CheckAndExit(err, "conf.yaml err #%v ", err)

  err = yaml.Unmarshal(yamlFile, &config)
  utils.CheckAndExit(err, "Unmarshal: %v", err)

  // todo 开启shadow-socks 子进程
  err = exec.Command("ls").Start()
  utils.CheckAndExit(err, "Failed to start shadowsocks.")

  shadowsocksServer := shadowsocks.New(&config)

  managerServer := server.New(&config, shadowsocksServer)
  managerServer.Run()
}


