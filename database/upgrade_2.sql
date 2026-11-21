-- PuddingLogin 升级脚本 2：平台矩阵
-- 幂等脚本，可重复执行

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

INSERT INTO `pl_platform` (`type`,`showname`,`mode`,`status`,`sort`,`official_link`,`note`) VALUES
('puddingchat','PuddingChat','system',1,10,'','系统内互通'),
('qq','QQ','official',1,20,'https://connect.qq.com/',''),
('wx','微信','official',1,30,'https://open.weixin.qq.com/',''),
('alipay','支付宝','official',0,40,'https://open.alipay.com/',''),
('sina','微博','official',1,50,'https://open.weibo.com/',''),
('baidu','百度','system',0,60,'https://developer.baidu.com/','系统内互通'),
('huawei','华为','system',0,70,'https://developer.huawei.com/','系统内互通'),
('xiaomi','小米','official',0,80,'https://dev.mi.com/',''),
('google','谷歌','official',1,90,'https://console.cloud.google.com/',''),
('microsoft','微软','official',1,100,'https://portal.azure.com/',''),
('facebook','Facebook','official',1,110,'https://developers.facebook.com/',''),
('twitter','Twitter','official',1,120,'https://developer.twitter.com/',''),
('dingtalk','钉钉','system',0,130,'https://open.dingtalk.com/','系统内互通'),
('gitee','Gitee','official',1,140,'https://gitee.com/oauth/applications',''),
('github','GitHub','official',1,150,'https://github.com/settings/developers','')
ON DUPLICATE KEY UPDATE `showname`=VALUES(`showname`);
