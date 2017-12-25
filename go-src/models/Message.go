package models

type Message struct {
	Command string `json:"comman"`
	Port int32 `json:"port"`
	Options *Options `json:"options"`
}