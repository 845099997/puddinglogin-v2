SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pl_config (
  k varchar(64) NOT NULL,
  v text,
  PRIMARY KEY (k)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_user (
  uid int unsigned NOT NULL AUTO_INCREMENT,
  username varchar(64) NOT NULL,
  pwd varchar(255) NOT NULL,
  email varchar(128) DEFAULT NULL,
  phone varchar(32) DEFAULT NULL,
  qq_uid varchar(64) DEFAULT NULL,
  wx_uid varchar(64) DEFAULT NULL,
  alipay_uid varchar(64) DEFAULT NULL,
  nickname varchar(64) DEFAULT NULL,
  avatar varchar(255) DEFAULT NULL,
  money decimal(10,2) NOT NULL DEFAULT 0.00,
  gid int NOT NULL DEFAULT 0,
  status tinyint NOT NULL DEFAULT 1,
  addtime datetime DEFAULT NULL,
  lasttime datetime DEFAULT NULL,
  lastip varchar(64) DEFAULT NULL,
  PRIMARY KEY (uid),
  UNIQUE KEY uk_username (username),
  KEY idx_email (email),
  KEY idx_phone (phone),
  KEY idx_qq (qq_uid),
  KEY idx_wx (wx_uid),
  KEY idx_alipay (alipay_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_apps (
  id int unsigned NOT NULL AUTO_INCREMENT,
  appid varchar(40) NOT NULL,
  appkey varchar(64) NOT NULL,
  uid int unsigned NOT NULL DEFAULT 0,
  name varchar(64) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'qq',
  status tinyint NOT NULL DEFAULT 1,
  domain_limit tinyint NOT NULL DEFAULT 0,
  addtime datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_appid (appid),
  KEY idx_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_appdomain (
  id int unsigned NOT NULL AUTO_INCREMENT,
  appid varchar(40) NOT NULL,
  domain varchar(128) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_appid (appid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_accounts (
  id int unsigned NOT NULL AUTO_INCREMENT,
  uid int unsigned NOT NULL DEFAULT 0,
  type varchar(16) NOT NULL,
  social_uid varchar(64) NOT NULL,
  nickname varchar(64) DEFAULT NULL,
  faceimg varchar(255) DEFAULT NULL,
  addtime datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_social (type, social_uid),
  KEY idx_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_userlog (
  id int unsigned NOT NULL AUTO_INCREMENT,
  uid int unsigned NOT NULL DEFAULT 0,
  type varchar(32) NOT NULL,
  date datetime DEFAULT NULL,
  ip varchar(64) DEFAULT NULL,
  ua varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_uid (uid),
  KEY idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_regcode (
  id int unsigned NOT NULL AUTO_INCREMENT,
  type tinyint NOT NULL DEFAULT 0,
  code varchar(16) NOT NULL,
  target varchar(128) NOT NULL,
  time int NOT NULL DEFAULT 0,
  ip varchar(64) DEFAULT NULL,
  status tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_target (target),
  KEY idx_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_group (
  gid int NOT NULL AUTO_INCREMENT,
  name varchar(32) NOT NULL,
  ucount int NOT NULL DEFAULT 0,
  info text,
  PRIMARY KEY (gid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pl_oauth_state (
  id int unsigned NOT NULL AUTO_INCREMENT,
  state varchar(64) NOT NULL,
  uid int unsigned NOT NULL DEFAULT 0,
  type varchar(16) NOT NULL,
  redirect varchar(255) DEFAULT NULL,
  expire int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS pl_ticket (
  id int unsigned NOT NULL AUTO_INCREMENT,
  uid int unsigned NOT NULL DEFAULT 0,
  title varchar(128) NOT NULL,
  category varchar(32) NOT NULL DEFAULT 'other',
  content text,
  status tinyint NOT NULL DEFAULT 0,
  priority tinyint NOT NULL DEFAULT 1,
  admin_uid int unsigned NOT NULL DEFAULT 0,
  replycount int unsigned NOT NULL DEFAULT 0,
  lastreply varchar(16) NOT NULL DEFAULT 'user',
  addtime datetime DEFAULT NULL,
  updatetime datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_uid (uid),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS pl_ticket_reply (
  id int unsigned NOT NULL AUTO_INCREMENT,
  tid int unsigned NOT NULL DEFAULT 0,
  uid int unsigned NOT NULL DEFAULT 0,
  role varchar(16) NOT NULL DEFAULT 'user',
  content text,
  addtime datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_tid (tid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO pl_config (k, v) VALUES
('sitename', 'PuddingLogin'),
('title', 'PuddingLogin · 聚合登录与用户中心'),
('keywords', '聚合登录,QQ登录,微信登录,支付宝登录,OAuth2'),
('description', 'PuddingLogin 是一套现代化聚合登录平台，支持 QQ、微信、支付宝等社交账号一键接入。'),
('reg_open', '1'),
('captcha_open_login', '0'),
('test_open', '0'),
('kfqq', ''),
('default_appid', ''),
('oauth_qq_appid', ''),
('oauth_qq_appkey', ''),
('oauth_wx_appid', ''),
('oauth_wx_appkey', ''),
('oauth_alipay_appid', ''),
('oauth_alipay_appkey', ''),
('sys_key', 'pl-4f8c2a91d7e6b3c0'),
('siteurl', 'https://login.idcbdy.top/')
ON DUPLICATE KEY UPDATE v = VALUES(v);

INSERT INTO pl_group (gid, name, ucount, info) VALUES (1, '基础用户', 0, '{}')
ON DUPLICATE KEY UPDATE name = VALUES(name);
