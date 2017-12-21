package db

import (
	"database/sql"
	"fmt"
	_ "github.com/mattn/go-sqlite3"
	"io/ioutil"
	"ss-node/utils"
)

type Database struct {
	db * sql.DB
}

func (self *Database) Connect() {
	db, err := sql.Open("sqlite3", ".foo.db")

	utils.CheckAndPanic(err)

	self.db = db
}

func(self *Database) InitTables() {
	data, err := ioutil.ReadFile("data/tables.sql")

	utils.CheckAndPanic(err)

	createTablesString := string(data)

	_, err = self.db.Query(createTablesString)

	utils.CheckAndPanic(err)

	fmt.Println("Init tatabase successfull")
}

type Models struct {
	database * Database
}
