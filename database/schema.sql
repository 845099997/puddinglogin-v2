-- PuddingLogin 安装数据脚本
-- 包含全量建表语句、初始平台数据与站点配置

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `pl_config` (
  `k` varchar(64) NOT NULL,
  `v` text,
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_user` (
  `uid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `pwd` varchar(255) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `qq_uid` varchar(64) DEFAULT NULL,
  `wx_uid` varchar(64) DEFAULT NULL,
  `alipay_uid` varchar(64) DEFAULT NULL,
  `nickname` varchar(64) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `money` decimal(10,2) NOT NULL DEFAULT '0.00',
  `gid` int(11) NOT NULL DEFAULT '0',
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `addtime` datetime DEFAULT NULL,
  `lasttime` datetime DEFAULT NULL,
  `lastip` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_phone` (`phone`),
  KEY `idx_qq` (`qq_uid`),
  KEY `idx_wx` (`wx_uid`),
  KEY `idx_alipay` (`alipay_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_group` (
  `gid` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `ucount` int(11) NOT NULL DEFAULT '0',
  `info` text,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '售价',
  `expire_months` int(11) NOT NULL DEFAULT '0' COMMENT '有效期（月），0 表示永久',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序，越小越靠前',
  `buyable` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否可购买',
  `logins` varchar(512) NOT NULL DEFAULT '' COMMENT '可用登录方式，逗号分隔，空表示全部',
  PRIMARY KEY (`gid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_accounts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `appid` varchar(32) NOT NULL DEFAULT '' COMMENT '来源应用',
  `type` varchar(16) NOT NULL,
  `social_uid` varchar(64) NOT NULL,
  `nickname` varchar(64) DEFAULT NULL,
  `faceimg` varchar(255) DEFAULT NULL,
  `addtime` datetime DEFAULT NULL,
  `gender` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0 未知 1 男 2 女',
  `lasttime` datetime DEFAULT NULL COMMENT '最后登录时间',
  `lastip` varchar(64) DEFAULT NULL COMMENT '最后登录 IP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_social` (`type`,`social_uid`),
  KEY `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_apps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `appid` varchar(40) NOT NULL,
  `appkey` varchar(64) NOT NULL,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `name` varchar(64) NOT NULL,
  `type` varchar(16) NOT NULL DEFAULT 'qq',
  `types` varchar(255) NOT NULL DEFAULT '' COMMENT '允许的登录方式，逗号分隔，空表示全部已开启方式',
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `domain_limit` tinyint(4) NOT NULL DEFAULT '0',
  `addtime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_appid` (`appid`),
  KEY `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_appdomain` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `appid` varchar(40) NOT NULL,
  `domain` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_appid` (`appid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_adminlog` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `action` varchar(64) NOT NULL DEFAULT '',
  `detail` varchar(500) NOT NULL DEFAULT '',
  `target` varchar(128) NOT NULL DEFAULT '',
  `date` datetime DEFAULT NULL,
  `ip` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_date` (`date`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_userlog` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `type` varchar(32) NOT NULL,
  `date` datetime DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `ua` varchar(255) DEFAULT NULL,
  `appid` varchar(32) NOT NULL DEFAULT '' COMMENT '来源应用',
  `social_uid` varchar(64) NOT NULL DEFAULT '' COMMENT '第三方账号标识',
  `domain` varchar(128) NOT NULL DEFAULT '' COMMENT '来源网站域名',
  `way` varchar(16) NOT NULL DEFAULT '' COMMENT '登录方式',
  PRIMARY KEY (`id`),
  KEY `idx_uid` (`uid`),
  KEY `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_platform` (
  `type` varchar(16) NOT NULL,
  `showname` varchar(32) NOT NULL,
  `mode` varchar(16) NOT NULL DEFAULT 'official',
  `status` tinyint(1) NOT NULL DEFAULT '0',
  `sort` int(11) NOT NULL DEFAULT '0',
  `official_link` varchar(160) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `updatetime` datetime DEFAULT NULL,
  PRIMARY KEY (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_oauth_state` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `state` varchar(64) NOT NULL,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `type` varchar(16) NOT NULL,
  `redirect` varchar(255) DEFAULT NULL,
  `expire` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_connect_flow` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `state` varchar(64) NOT NULL,
  `appid` varchar(40) NOT NULL,
  `type` varchar(16) NOT NULL,
  `redirect` varchar(500) NOT NULL,
  `expire` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_state` (`state`),
  KEY `idx_expire` (`expire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_connect_code` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `appid` varchar(40) NOT NULL,
  `type` varchar(16) NOT NULL,
  `social_uid` varchar(64) NOT NULL,
  `nickname` varchar(64) DEFAULT NULL,
  `faceimg` varchar(255) DEFAULT NULL,
  `location` varchar(64) DEFAULT NULL,
  `gender` varchar(16) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `expire` int(11) NOT NULL DEFAULT '0',
  `used` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_social` (`type`,`social_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_regcode` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` tinyint(4) NOT NULL DEFAULT '0',
  `code` varchar(16) NOT NULL,
  `target` varchar(128) NOT NULL,
  `time` int(11) NOT NULL DEFAULT '0',
  `ip` varchar(64) DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_target` (`target`),
  KEY `idx_ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pl_order` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `orderno` varchar(64) NOT NULL,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `gid` int(11) NOT NULL DEFAULT '0',
  `title` varchar(128) NOT NULL DEFAULT '',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paytype` varchar(16) NOT NULL DEFAULT '',
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0 待支付 1 已支付 2 已关闭',
  `addtime` datetime DEFAULT NULL,
  `paytime` datetime DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orderno` (`orderno`),
  KEY `idx_uid` (`uid`),
  KEY `idx_status` (`status`),
  KEY `idx_addtime` (`addtime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付订单';
CREATE TABLE IF NOT EXISTS `pl_ticket` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `title` varchar(128) NOT NULL,
  `category` varchar(32) NOT NULL DEFAULT 'other',
  `content` text,
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0 待处理 1 处理中 2 已完成 3 已关闭',
  `priority` tinyint(4) NOT NULL DEFAULT '1',
  `admin_uid` int(10) unsigned NOT NULL DEFAULT '0',
  `replycount` int(10) unsigned NOT NULL DEFAULT '0',
  `lastreply` varchar(16) NOT NULL DEFAULT 'user',
  `addtime` datetime DEFAULT NULL,
  `updatetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_uid` (`uid`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单';
CREATE TABLE IF NOT EXISTS `pl_ticket_reply` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tid` int(10) unsigned NOT NULL DEFAULT '0',
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `role` varchar(16) NOT NULL DEFAULT 'user',
  `content` text,
  `addtime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tid` (`tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单回复';

-- 初始用户组
INSERT INTO `pl_group` (`gid`, `name`, `ucount`, `info`, `price`, `expire_months`, `sort`, `buyable`, `logins`) VALUES
(1, '基础用户', 0, '{}', 0.00, 0, 0, 0, '');

-- 初始登录平台
INSERT INTO `pl_platform` (`type`, `showname`, `mode`, `status`, `sort`, `official_link`, `note`, `updatetime`) VALUES
('puddingchat', 'PuddingChat', 'system', 1, 10, 'https://sdk.idcbdy.com/', '', NOW()),
('qq', 'QQ', 'official', 1, 20, 'https://connect.qq.com/', '', NOW()),
('wx', '微信', 'official', 1, 30, 'https://open.weixin.qq.com/', '', NOW()),
('alipay', '支付宝', 'official', 0, 40, 'https://open.alipay.com/', '', NOW()),
('sina', '微博', 'official', 1, 50, 'https://open.weibo.com/', '', NOW()),
('baidu', '百度', 'system', 0, 60, 'https://developer.baidu.com/', '', NOW()),
('huawei', '华为', 'system', 0, 70, 'https://developer.huawei.com/', '', NOW()),
('xiaomi', '小米', 'official', 0, 80, 'https://dev.mi.com/', '', NOW()),
('google', '谷歌', 'official', 1, 90, 'https://console.cloud.google.com/', '', NOW()),
('microsoft', '微软', 'official', 1, 100, 'https://portal.azure.com/', '', NOW()),
('facebook', 'Facebook', 'official', 1, 110, 'https://developers.facebook.com/', '', NOW()),
('twitter', 'Twitter', 'official', 1, 120, 'https://developer.twitter.com/', '', NOW()),
('dingtalk', '钉钉', 'system', 0, 130, 'https://open.dingtalk.com/', '', NOW()),
('gitee', 'Gitee', 'official', 1, 140, 'https://gitee.com/oauth/applications', '', NOW()),
('github', 'GitHub', 'official', 1, 150, 'https://github.com/settings/developers', '', NOW());

-- 初始站点配置
INSERT INTO `pl_config` (`k`, `v`) VALUES
('sitename', 'PuddingLogin'),
('title', 'PuddingLogin · 聚合登录与用户中心'),
('keywords', '聚合登录,QQ登录,微信登录,支付宝登录,OAuth2'),
('description', 'PuddingLogin 是一套现代化聚合登录平台，支持 QQ、微信、支付宝等社交账号一键接入。'),
('siteurl', ''),
('kfqq', ''),
('reg_open', '1'),
('reg_channel', 'both'),
('captcha_open_login', '0'),
('test_open', '0'),
('site_icp', ''),
('site_footer', ''),
('logo_path', '/logo.png'),
('favicon_path', '/favicon.ico'),
('default_appid', ''),
('quick_puddingchat', '0'),
('quick_qq', '0'),
('quick_wx', '0'),
('quick_alipay', '0'),
('group_buy_open', '0');

SET FOREIGN_KEY_CHECKS = 1;
