# PuddingLogin v2 
PuddingLogin 布丁云（广东）网络科技有限公司 ©版权所有
QQ：845099997，邮箱：idcbdy@vip.qq.com
前台演示站：https://login.bdy.pp.ua/#/login
后台演示站：https://login.bdy.pp.ua/#/admin
账号：admin      密码:123456
> 自研统一身份认证平台 · 开源版 v2.1.8

PuddingLogin 是一款开源的统一身份认证系统，支持 QQ、微信、PuddingChat、微博、Google、Microsoft、GitHub 等十余种第三方平台的 OAuth 授权登录与账号绑定。

## 特性

- 🌐 **多平台支持** — 内置 10+ 主流平台 OAuth 接入，一键授权登录
- 🔐 **安全可靠** — CSRF 防护、bcrypt 密码哈希、Session SameSite 策略
- 🎨 **现代化 UI** — React + TypeScript + Tailwind CSS，深色主题设计
- 📦 **即装即用** — 提供 Web 安装向导，3 分钟部署上线
- 🔌 **SDK 接入** — 提供标准化 SDK 接口，第三方应用可快速集成
- 📋 **管理后台** — 站点配置、平台管理、用户管理、应用管理一应俱全

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | PHP 7.4+ |
| 数据库 | MySQL 5.6+ / MariaDB 10.2+ |
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| Web 服务器 | Nginx / Apache |

## 快速开始

### 环境要求

- PHP >= 7.4（需启用 PDO、JSON、MBString、cURL 扩展）
- MySQL >= 5.6 或 MariaDB >= 10.2
- Nginx 或 Apache（推荐 Nginx）
- Node.js >= 16（**可选**，仅二次开发修改前端时用于构建）

### 部署步骤

1. **下载源码**

```bash
git clone https://gitee.com/budingyun6/puddinglogin-v2.git
cd puddinglogin-v2
```

2. **配置 Nginx**

将网站根目录指向项目目录，并配置伪静态规则：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/puddinglogin-v2;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/tmp/php-cgi-74.sock;
        fastcgi_index index.php;
        include fastcgi.conf;
    }
}
```

3. **创建数据库并导入**

```bash
mysql -u root -p -e "CREATE DATABASE puddinglogin DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p puddinglogin < database/schema.sql
```

4. **配置数据库连接**

编辑 `app/core.php` 中的数据库常量。

5. **访问安装向导**

浏览器访问 `http://your-domain.com/` 进入安装向导。

## 宝塔面板安装（推荐）

面向宝塔 Linux 面板的可视化部署流程，全程浏览器操作，无需命令行基础。

### 一、准备环境

在「软件商店」安装以下组件：

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| Nginx | 1.20+ | Web 服务器 |
| MySQL | 5.7 / 8.0 | 数据库 |
| PHP | 7.4 | 必需 |

进入「软件商店 → PHP 7.4 → 设置 → 安装扩展」，确保以下扩展已安装：

```
pdo_mysql  mbstring  curl  openssl  fileinfo
```

缺少前四个扩展会在安装向导的环境检测环节直接拦下。

### 二、创建站点

1. 打开「网站 → 添加站点」
2. 域名：填写你的域名，例如 demo.example.com
3. 根目录：保持默认，例如 `/www/wwwroot/demo.example.com`
4. FTP：选择「不创建」
5. 数据库：选择 MySQL 并记下库名、用户名、密码（也可以留到安装向导第一步由程序自动建库）
6. PHP 版本：选择 7.4

### 三、上传源码

**方式一（推荐，便于后续更新）**：删除站点根目录下的默认文件（`index.html`、`404.html` 等），打开宝塔「终端」执行：

```bash
cd /www/wwwroot/demo.example.com
git clone https://gitee.com/budingyun6/puddinglogin-v2.git .
```

**方式二**：本地下载源码 zip，通过「文件 → 上传」上传后在线解压到站点根目录。

无论哪种方式，完成后站点根目录下应能直接看到 `index.php`、`app/`、`assets/`、`install/`，**不要再多嵌套一层目录**。

### 四、设置运行目录与伪静态

1. 「网站 → 你的站点 → 设置 → 网站目录」
   - 运行目录：保持 `/`（站点根目录），**不要**改成 public 之类的子目录
   - 确认「防跨站攻击（open_basedir）」的路径与站点实际路径一致
2. 「设置 → 伪静态」，粘贴以下规则并保存：

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

该规则必须配置，否则除首页外的路由与 OAuth 回调都会返回 404。

### 五、目录权限

在「文件」中右键站点根目录 → 权限：

- 所有者：`www`
- 权限：`755`
- 勾选「应用到子目录」

`storage/` 目录必须可写，安装向导会向其中写入 `storage/database.php` 与 `storage/installed.lock`。若不可写，数据库配置环节会报错。

如果站点根目录存在 `.user.ini`，内容形如：

```ini
open_basedir=/www/wwwroot/demo.example.com/:/tmp/
```

请确认其中的路径与你的实际站点路径完全一致，否则程序会读不到文件。

### 六、运行安装向导

浏览器访问 `http://你的域名/`，按五步完成安装：

| 步骤 | 内容 | 说明 |
| --- | --- | --- |
| 1 | 环境检测 | PHP 版本、扩展、storage 可写、install.sql 齐备，全部通过才能继续 |
| 2 | 数据库配置 | 主机 127.0.0.1、端口 3306、库名、用户名、密码；表前缀固定为 `pl_` |
| 3 | 管理员账号 | 设置后台管理员的用户名、昵称、密码 |
| 4 | 站点信息 | 站点名称、客服 QQ、站点地址、ICP 备案号、页脚 |
| 5 | 安装完成 | 写入配置与安装锁，系统正式可用 |

第 2 步填写的数据库账号需要具备建库建表权限：向导会自动执行 `CREATE DATABASE IF NOT EXISTS`，再导入 `install/install.sql` 建表。

### 七、安装后建议

1. 「网站 → 设置 → SSL」申请证书并开启「强制 HTTPS」
2. 安装完成后建议删除 `install/` 目录，避免被重复访问。确需重装时，删除 `storage/installed.lock` 并清空数据库，重新上传 `install/` 再访问
3. 「计划任务」中为站点目录与数据库配置定期备份

### 八、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 打开就显示「系统已安装」 | 站点根目录存在 `storage/installed.lock`。删除该文件后重试。新版源码包已不会携带此文件 |
| 环境检测提示 storage 不存在或不可写 | 创建 `storage/` 目录，所有者设为 `www`，权限 755 |
| 除首页外全部 404 | 未配置伪静态，按第四步添加 try_files 规则 |
| 页面提示「前端资源尚未构建」 | `assets/app.js` 缺失。源码包已内置构建产物，检查解压是否完整；仅二次开发修改前端后才需要自行 `npm run build` |
| 数据库连接失败 | 核对账号、密码与授权库；宝塔默认不允许 root 远程连接，主机请填 127.0.0.1 |
| 部署在 CDN / 反向代理后，日志 IP 全是代理地址 | 进入「管理后台 → 系统设置 → IP 地址获取设置」，把「获取方式」改为「从请求头读取」，填写请求头（如 X-Forwarded-For、CF-Connecting-IP）与受信任代理 IP（支持 10.0.0.0/8 这类网段）。默认直连模式只取 REMOTE_ADDR，可防止客户端伪造 X-Forwarded-For 绕过验证码限流 |
| 安装完成后首页白屏 | 确认 PHP 版本为 7.4，并检查 `storage/database.php` 是否成功写入 |

## 前端构建（仅二次开发需要）

仓库已内置编译好的前端产物 `assets/app.js` 与 `assets/app.css`，**下载解压后即可直接运行，无需安装 Node.js、无需执行任何构建命令**。

仅在修改了 `frontend/src/` 下的前端源码后，才需要重新构建：

```bash
cd frontend
npm install
npm run build
```

构建产物会输出到项目根目录的 `assets/`，提交时请一并提交 `assets/app.js` 与 `assets/app.css`，否则使用者拉取后前端会提示未构建。

## 目录结构

```
├── index.php              # 站点入口
├── api.php                # API 入口
├── connect.php            # OAuth 回调入口
├── doc.php                # SDK 文档
├── app/                   # 后端核心
│   ├── core.php           # 核心函数库
│   ├── Api.php            # 公共 API
│   ├── Connect.php        # OAuth 连接器
│   └── AdminApi.php       # 管理 API
├── assets/                # 前端构建产物（已内置，开箱即用）
│   ├── app.js             # 打包后的脚本
│   └── app.css            # 打包后的样式
├── frontend/src/          # 前端源码（二次开发用）
│   ├── pages/             # 页面组件
│   ├── components/        # 通用组件
│   └── lib/               # 工具库
├── database/              # 数据库文件
├── install/               # 安装向导
└── LICENSE                # MIT 开源协议
```

## 支持的登录平台

QQ、微信、PuddingChat、支付宝、微博、Google、Microsoft、Facebook、Twitter、Gitee、GitHub

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

Copyright © 2026 布丁云（广东）网络科技有限公司

