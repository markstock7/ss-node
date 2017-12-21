package conf

type Config struct {
	Shadowsocks struct {
		Address string `yaml:"address"`
	}
	Manager struct {
		Address string `yaml:"address"`
		Password string `yaml:"password"`
	}
}
