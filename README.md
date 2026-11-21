# PuddingLogin v2

> 自研统一身份认证平台 · 开源版 v2.1.4

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
