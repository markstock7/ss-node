package server

import (
	"net"
	"crypto/md5"
	"time"
    "encoding/json"
	"ss-node/utils"
	"strconv"
	"fmt"
	"ss-node/models"
	"ss-node/conf"
	"ss-node/shadowsocks"
)

type Server struct {

	// 验证数据的管道
	conn_chan chan net.Conn

	conf *conf.Config

	ss * shadowsocks.Shadowsocks
}

func New(conf *conf.Config, ss * shadowsocks.Shadowsocks) *Server {
	return &Server{
		conn_chan: make(chan net.Conn),
		conf: conf,
		ss: ss,
	}
}

func (self *Server) Run() {
	err := self.ss.Connect()

	if err != nil {
		utils.CheckAndExit(err, "Failed to connect shadowsocks.", err)
	}

	listener, err := net.Listen("tcp", self.conf.Manager.Address)

	if err != nil {
		defer listener.Close()
	}

	defer listener.Close()

	go func() {
		for conn := range self.conn_chan {
			self.handleConnection(conn)
		}
	}()

	for {
		conn, err := listener.Accept()

		if err != nil {
			continue
		}

		self.conn_chan <- conn
	}
}

func (self *Server) handleConnection(conn net.Conn) {

	defer conn.Close()

	buffer := make([]byte, 1024)

	for {
		n, err := conn.Read(buffer)

		fmt.Println(buffer)
		if err != nil {
			return
		}

		self.checkData(buffer[0: n])
	}
}

func (self *Server) receiveCommand(data []byte, code []byte) {
	message := &models.Message {
		Options: &models.Options{},
	}

	err := json.Unmarshal(data, message)

	if err != nil {
		return
	}

	switch command := message.Command; command {
		case "add":
			fmt.Println("OS X.")
		case "del":
			fmt.Println("Linux.")
		case "list":
			fmt.Println("Linux.")
		case "pwd":
			fmt.Println("Linux.")
		case "flow":
		case "version":
			fmt.Println("Linux.")
		case "ip":
			fmt.Println("Linux.")
		default:
	}

}

func (self *Server) checkData(buffer []byte) {
	var length = 0

	if len(buffer) < 2 {
		return
	}

	length = int(buffer[0]) * 256 + int(buffer[1])

	if len(buffer) >= length + 2 {
		data := buffer[2: length - 2]
		code := buffer[length - 2:]


		if !self.checkCode(data, self.conf.Manager.Password, code) {
			return
		}

		self.receiveCommand(data, code)
	}
}

func (self *Server) checkCode(data []byte, password string, code []byte) bool {
	timestamp, err := strconv.ParseInt(utils.ByteToHex(data[0:6]), 16, 64)

	if err != nil {
		return false
	}

	if ((time.Now().Unix() / 1000 / 1000 - timestamp) > 10 * 60 * 1000) {
		return false
	}

	command := string(data[6:])
	hash := fmt.Sprintf("%x", md5.Sum( []byte( strconv.FormatInt(timestamp,10) + command + password )))

	return hash[0: 8] == utils.ByteToHex(code)
}

func (self *Server) pack(buffer []byte) []byte {
	length := len(buffer)
	lengthBuffer := "0000" + strconv.FormatInt(int64(length), 16)
	c := lengthBuffer[(len(lengthBuffer) - 4):]

	for _, v  := range utils.HexToBye(c) {
		buffer = append(buffer, v)
	}

	return buffer
}