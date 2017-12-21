package utils

import (
	"os"
	"fmt"
)

func CheckAndPanic(err error) {
	if err != nil {
		panic(err)
	}
}

func CheckAndExit(err error, msg ...interface{}) {
	if err != nil {
		fmt.Println(msg)
		os.Exit(1)
	}
}