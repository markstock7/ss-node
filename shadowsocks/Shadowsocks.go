package shadowsocks

import (
	"net"
	"encoding/json"
	"fmt"
	"time"
	"ss-node/models"
	"strconv"
	"ss-node/conf"
)

type Shadowsocks struct {

	conf *conf.Config

	conn_chan chan net.Conn

	write_chan chan []byte

	err_chan  chan error

	shadowsocks_type string

	last_flows map[string]int

	set_port_ip_chan chan map[string]int
}

func New(conf *conf.Config) *Shadowsocks {
	return &Shadowsocks{
		conn_chan: make(chan net.Conn),
		shadowsocks_type: "libev",
		last_flows: make(map[string]int),
		conf: conf,
	}
}

func (self * Shadowsocks) Connect() error {
	tcpAddr, err := net.ResolveUDPAddr("udp4", self.conf.Shadowsocks.Address)

	if err != nil {
		return err
	}

	conn, err := net.DialUDP("udp", nil, tcpAddr)

	if err != nil {
		return err
	}

	defer conn.Close()

	go self.HandleRead(conn)
	go self.HandleSend(conn)

	return nil
}


func (self *Shadowsocks) Send(buffer []byte) {
	self.write_chan <- buffer
}

func (self *Shadowsocks) HandleSend(conn *net.UDPConn) {
	for {
		data := <- self.write_chan
		conn.Write(data)
	}
}

func (self *Shadowsocks) HandleRead(conn *net.UDPConn) {
	for {
		data := make([]byte, 1024)

		_, _, err := conn.ReadFromUDP(data)

		if err != nil {
			self.processMessage(data)
		}
	}
}

func (self *Shadowsocks) processMessage(buffer []byte) {
	message := string(buffer)

	if (message[0: 4] == "pong") {
		self.shadowsocks_type = "python"

	} else if (message[0: 5] == "state:") {
		flows := map[string]int{}
		json.Unmarshal([]byte(message[:5]), &flows)

		var records [] models.Flow

		for port, flow := range self.CompareWithLastFlow(flows) {
			if flow > 0 {
				f := models.Flow {
					port,
					flow ,
					string(time.Now().UnixNano()),
				}

				records = append(records, f)
			}
		}

		/**
		 * todo 根据返回的流量来删除 多余的账号，来确保改账号不存在
		 */
		if len(records) > 0 {
			models.BatchCreateFlow(records)
		}
	}
}

func (self *Shadowsocks) setExitPort(flows map[string]int) {

}

func (self *Shadowsocks) CompareWithLastFlow (flows map[string]int) map[string]int {
	if (self.shadowsocks_type == "python") {
		return flows
	}

	real_flows := make(map[string]int)

	for port, flow := range flows {
		v, ok := self.last_flows[port]

		if ok {
			real_flows[port] = flow - v
		} else {
			real_flows[port] = flow
		}

		if real_flows[port] < 0 {
			delete(real_flows, port)
		}

	}

	return real_flows
}

func handleWrite(conn net.Conn, done chan string) {
	for i := 10; i > 0; i-- {
		_, e := conn.Write([]byte("hello " + strconv.Itoa(i) + "\r\n"))
		if e != nil {
			fmt.Println("Error to send message because of ", e.Error())
			break
		}
	}
	done <- "Sent"
}

func (self *Shadowsocks) getFlow(options *server.Options) {
	startTime := options.StartTime
	endTime := options.EndTime

	for index, flow := range models.GetFlows(startTime, endTime) {
	}
}