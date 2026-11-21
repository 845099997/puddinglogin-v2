SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pl_connect_flow (
  id int unsigned NOT NULL AUTO_INCREMENT,
  state varchar(64) NOT NULL,
  appid varchar(40) NOT NULL,
  type varchar(16) NOT NULL,
  redirect varchar(500) NOT NULL,
  expire int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_state (state),
  KEY idx_expire (expire)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_connect_code (
  id int unsigned NOT NULL AUTO_INCREMENT,
  code varchar(64) NOT NULL,
  appid varchar(40) NOT NULL,
  type varchar(16) NOT NULL,
  social_uid varchar(64) NOT NULL,
  nickname varchar(64) DEFAULT NULL,
  faceimg varchar(255) DEFAULT NULL,
  location varchar(64) DEFAULT NULL,
  gender varchar(16) DEFAULT NULL,
  ip varchar(64) DEFAULT NULL,
  expire int NOT NULL DEFAULT 0,
  used tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code),
  KEY idx_social (type, social_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
