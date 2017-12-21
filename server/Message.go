package server

type Options struct {
	StartTime string `json:"startTime"`
	EndTime string `json:"endTime"`
	Clear bool `json:"clear"`
}

type Message struct {
	Command string `json:"comman"`
	Port int32 `json:"port"`
	Options *Options `json:"options"`
}