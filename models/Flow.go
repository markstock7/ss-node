package models

import (
	"github.com/astaxie/beego/orm"
	"fmt"
)

type Flow struct {
	Port string
	Flow int
	Time string
}

func (t *Flow) TableName() string {
	return TableName("flows")
}

func BatchCreateFlow(flows []Flow) {
	if num, err := orm.NewOrm().InsertMulti(len(flows), flows); err != nil {
		fmt.Println(err)
	} else {
		fmt.Printf("Insert %d flows' data!\r\n", num)
	}
}

func GetFlows(startTime string, endTime string) []*Flow {
	var flows []*Flow

	_, err := orm.NewOrm().QueryTable("flows").Filter("time__in", startTime, endTime).All(&flows)

	if err != nil {
		println(err)
	}

	return flows
}

