<?php
declare(strict_types=1);

final class SystemApi
{
    private const SCHEMA = [
        'site' => [
            'label' => '网站信息配置',
            'icon' => 'shield',
            'desc' => '站点名称、标题、地址、SEO 与客服信息',
            'fields' => [
                'sitename' => ['label' => '站点名称', 'kind' => 'text', 'placeholder' => 'PuddingLogin', 'conf' => 'sitename'],
                'title' => ['label' => '网站标题', 'kind' => 'text', 'placeholder' => 'PuddingLogin · 聚合登录与用户中心', 'conf' => 'title'],
                'siteurl' => ['label' => '站点地址', 'kind' => 'text', 'placeholder' => 'https://login.example.com', 'mono' => true, 'conf' => 'siteurl'],
                'keywords' => ['label' => 'SEO 关键词', 'kind' => 'text', 'placeholder' => '聚合登录,QQ登录,微信登录', 'conf' => 'keywords'],
                'description' => ['label' => '站点描述', 'kind' => 'textarea', 'placeholder' => '一句话介绍你的站点', 'conf' => 'description'],
                'kfqq' => ['label' => '客服 QQ', 'kind' => 'text', 'placeholder' => '10001', 'conf' => 'kfqq'],
                'kfemail' => ['label' => '客服邮箱', 'kind' => 'text', 'placeholder' => 'support@example.com', 'conf' => 'kfemail'],
                'icp' => ['label' => '备案号', 'kind' => 'text', 'placeholder' => '粤ICP备xxxxxxxx号', 'conf' => 'site_icp'],
                'footer' => ['label' => '页脚版权', 'kind' => 'text', 'placeholder' => '© PuddingLogin', 'conf' => 'site_footer'],
            ],
        ],
        'login' => [
            'label' => '快捷登录配置',
            'icon' => 'lock',
            'desc' => '注册开关、登录验证码、演示模式与密码规则',
            'fields' => [
                'quick_puddingchat' => ['label' => 'PuddingChat 快捷登录', 'kind' => 'bool', 'desc' => '开启后登录页展示 PuddingChat 快捷登录按钮', 'conf' => 'quick_puddingchat'],
                'quick_qq' => ['label' => 'QQ 快捷登录', 'kind' => 'bool', 'desc' => '开启后登录页展示 QQ 快捷登录按钮', 'conf' => 'quick_qq'],
                'quick_wx' => ['label' => '微信快捷登录', 'kind' => 'bool', 'desc' => '开启后登录页展示微信快捷登录按钮', 'conf' => 'quick_wx'],
                'quick_alipay' => ['label' => '支付宝快捷登录', 'kind' => 'bool', 'desc' => '开启后登录页展示支付宝快捷登录按钮', 'conf' => 'quick_alipay'],
                'default_appid' => ['label' => '默认应用 APPID', 'kind' => 'text', 'placeholder' => '快捷登录使用的默认应用 APPID', 'mono' => true, 'conf' => 'default_appid'],
                'reg_open' => ['label' => '开放注册', 'kind' => 'bool', 'desc' => '关闭后新用户无法自助注册', 'conf' => 'reg_open'],
                'reg_channel' => ['label' => '注册通道', 'kind' => 'select', 'options' => ['both' => '邮箱与手机均可', 'email' => '仅邮箱', 'phone' => '仅手机号'], 'desc' => '控制注册页可用的验证通道，需同时配置对应的邮件/短信服务', 'conf' => 'reg_channel'],
                'captcha_open_login' => ['label' => '登录验证码', 'kind' => 'bool', 'desc' => '开启后登录需要图形验证码', 'conf' => 'captcha_open_login'],
                'test_open' => ['label' => '演示模式', 'kind' => 'bool', 'desc' => '开启后展示演示验证码，便于调试', 'conf' => 'test_open'],
                'demo_password' => ['label' => '演示密码', 'kind' => 'secret', 'desc' => '至少 6 位；开启演示模式时设置，关闭演示模式时必须输入该密码', 'placeholder' => '留空表示不修改', 'conf' => 'demo_password'],
                'login_notice' => ['label' => '登录页公告', 'kind' => 'textarea', 'placeholder' => '展示在登录页顶部的提示文字'],
                'reg_notice' => ['label' => '注册页公告', 'kind' => 'textarea', 'placeholder' => '展示在注册页顶部的提示文字'],
                'pwd_min' => ['label' => '密码最小长度', 'kind' => 'number', 'placeholder' => '6'],
                'pwd_max' => ['label' => '密码最大长度', 'kind' => 'number', 'placeholder' => '64'],
            ],
        ],
        'pay' => [
            'label' => '支付接口配置',
            'icon' => 'chart',
            'desc' => '支付宝、QQ 钱包、微信三个渠道各自独立选择支付接口，选中服务商后填写对应凭据',
            'fields' => [
                'alipay_channel' => ['label' => '支付宝支付接口', 'kind' => 'select', 'options' => ['close' => '关闭', 'official' => '支付宝电脑+手机网站支付', 'epay' => '易支付接口', 'epay_backup' => '易支付接口（备用1）'], 'desc' => '选「关闭」则前台不展示支付宝支付', 'conf' => 'pay_alipay_channel'],
                'qq_channel' => ['label' => 'QQ 钱包支付接口', 'kind' => 'select', 'options' => ['close' => '关闭', 'official' => 'QQ 钱包官方接口', 'epay' => '易支付接口', 'epay_backup' => '易支付接口（备用1）'], 'desc' => '选「关闭」则前台不展示 QQ 钱包支付', 'conf' => 'pay_qq_channel'],
                'wx_channel' => ['label' => '微信支付接口', 'kind' => 'select', 'options' => ['close' => '关闭', 'official_mp' => '微信官方扫码+公众号支付', 'official_h5' => '微信官方扫码+H5支付', 'epay' => '易支付接口', 'epay_backup' => '易支付接口（备用1）'], 'desc' => '选「关闭」则前台不展示微信支付', 'conf' => 'pay_wx_channel'],
                'alipay_appid' => ['label' => '支付宝 AppID', 'kind' => 'text', 'placeholder' => '支付宝开放平台应用 AppID', 'conf' => 'pay_alipay_appid', 'show_if' => ['label' => '支付宝官方配置', 'any' => [['key' => 'alipay_channel', 'in' => ['official']]]]],
                'alipay_key' => ['label' => '支付宝应用私钥', 'kind' => 'secret', 'placeholder' => '商户应用私钥', 'conf' => 'pay_alipay_appkey', 'show_if' => ['label' => '支付宝官方配置', 'any' => [['key' => 'alipay_channel', 'in' => ['official']]]]],
                'alipay_notify' => ['label' => '支付宝异步通知地址', 'kind' => 'text', 'placeholder' => 'https://login.example.com/pay/notify/alipay', 'mono' => true, 'conf' => 'pay_alipay_notify', 'show_if' => ['label' => '支付宝官方配置', 'any' => [['key' => 'alipay_channel', 'in' => ['official']]]]],
                'qq_mchid' => ['label' => 'QQ 钱包商户号', 'kind' => 'text', 'placeholder' => 'QQ 钱包分配的商户号', 'conf' => 'pay_qq_mchid', 'show_if' => ['label' => 'QQ 钱包官方配置', 'any' => [['key' => 'qq_channel', 'in' => ['official']]]]],
                'qq_key' => ['label' => 'QQ 钱包密钥', 'kind' => 'secret', 'placeholder' => 'QQ 钱包分配的密钥', 'conf' => 'pay_qq_key', 'show_if' => ['label' => 'QQ 钱包官方配置', 'any' => [['key' => 'qq_channel', 'in' => ['official']]]]],
                'qq_notify' => ['label' => 'QQ 钱包异步通知地址', 'kind' => 'text', 'placeholder' => 'https://login.example.com/pay/notify/qq', 'mono' => true, 'conf' => 'pay_qq_notify', 'show_if' => ['label' => 'QQ 钱包官方配置', 'any' => [['key' => 'qq_channel', 'in' => ['official']]]]],
                'wx_appid' => ['label' => '微信 AppID', 'kind' => 'text', 'placeholder' => '公众号或开放平台 AppID', 'conf' => 'pay_wx_appid', 'show_if' => ['label' => '微信官方配置', 'any' => [['key' => 'wx_channel', 'in' => ['official_mp', 'official_h5']]]]],
                'wx_mchid' => ['label' => '微信商户号', 'kind' => 'text', 'placeholder' => '微信支付商户号', 'conf' => 'pay_wx_mchid', 'show_if' => ['label' => '微信官方配置', 'any' => [['key' => 'wx_channel', 'in' => ['official_mp', 'official_h5']]]]],
                'wx_key' => ['label' => '微信 API 密钥', 'kind' => 'secret', 'placeholder' => 'APIv2 密钥或 APIv3 私钥', 'conf' => 'pay_wx_appkey', 'show_if' => ['label' => '微信官方配置', 'any' => [['key' => 'wx_channel', 'in' => ['official_mp', 'official_h5']]]]],
                'wx_notify' => ['label' => '微信异步通知地址', 'kind' => 'text', 'placeholder' => 'https://login.example.com/pay/notify/wxpay', 'mono' => true, 'conf' => 'pay_wx_notify', 'show_if' => ['label' => '微信官方配置', 'any' => [['key' => 'wx_channel', 'in' => ['official_mp', 'official_h5']]]]],
                'epay_gateway' => ['label' => '易支付接口地址', 'kind' => 'text', 'placeholder' => 'https://pay.example.com/', 'mono' => true, 'conf' => 'pay_epay_gateway', 'show_if' => ['label' => '易支付配置', 'any' => [['key' => 'alipay_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'qq_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'wx_channel', 'in' => ['epay', 'epay_backup']]]]],
                'epay_appid' => ['label' => '易支付商户 ID', 'kind' => 'text', 'placeholder' => '易支付平台分配的商户 ID', 'conf' => 'pay_epay_appid', 'show_if' => ['label' => '易支付配置', 'any' => [['key' => 'alipay_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'qq_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'wx_channel', 'in' => ['epay', 'epay_backup']]]]],
                'epay_key' => ['label' => '易支付商户密钥', 'kind' => 'secret', 'placeholder' => '易支付平台分配的密钥', 'conf' => 'pay_epay_appkey', 'show_if' => ['label' => '易支付配置', 'any' => [['key' => 'alipay_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'qq_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'wx_channel', 'in' => ['epay', 'epay_backup']]]]],
                'epay_notify' => ['label' => '易支付异步通知地址', 'kind' => 'text', 'placeholder' => 'https://login.example.com/pay/notify/epay', 'mono' => true, 'conf' => 'pay_epay_notify', 'show_if' => ['label' => '易支付配置', 'any' => [['key' => 'alipay_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'qq_channel', 'in' => ['epay', 'epay_backup']], ['key' => 'wx_channel', 'in' => ['epay', 'epay_backup']]]]],
            ],
        ],
        'notice' => [
            'label' => '网站公告配置',
            'icon' => 'logs',
            'desc' => '站内公告与滚动通知',
            'fields' => [
                'notice_enable' => ['label' => '启用公告', 'kind' => 'bool', 'desc' => '关闭后前台不展示公告条'],
                'notice_title' => ['label' => '公告标题', 'kind' => 'text', 'placeholder' => '系统维护通知'],
                'notice_content' => ['label' => '公告内容', 'kind' => 'textarea', 'placeholder' => '支持纯文本'],
                'notice_link' => ['label' => '公告链接', 'kind' => 'text', 'placeholder' => 'https://', 'mono' => true],
            ],
        ],
        'mail' => [
            'label' => '邮箱与短信配置',
            'icon' => 'mail',
            'desc' => '验证码发送通道',
            'fields' => [
                'mail_enable' => ['label' => '启用邮件', 'kind' => 'bool', 'desc' => '用于邮箱验证码与找回密码'],
                'mail_host' => ['label' => 'SMTP 主机', 'kind' => 'text', 'placeholder' => 'smtp.example.com'],
                'mail_port' => ['label' => 'SMTP 端口', 'kind' => 'number', 'placeholder' => '465'],
                'mail_user' => ['label' => 'SMTP 账号', 'kind' => 'text', 'placeholder' => 'no-reply@example.com'],
                'mail_pass' => ['label' => 'SMTP 密码', 'kind' => 'secret', 'placeholder' => '留空不修改'],
                'mail_from' => ['label' => '发件人名称', 'kind' => 'text', 'placeholder' => 'PuddingLogin'],
                'sms_enable' => ['label' => '启用短信', 'kind' => 'bool', 'desc' => '用于手机验证码'],
                'sms_provider' => ['label' => '短信服务商', 'kind' => 'select', 'options' => ['tencent' => '腾讯云', 'aliyun' => '阿里云', 'custom' => '自定义', 'puddingv3' => '布丁云v3']],
                'sms_key' => ['label' => '短信 SecretId', 'kind' => 'text', 'placeholder' => 'SecretId'],
                'sms_secret' => ['label' => '短信 SecretKey', 'kind' => 'secret', 'placeholder' => '留空不修改'],
                'sms_sign' => ['label' => '短信签名', 'kind' => 'text', 'placeholder' => '布丁云'],
                'sms_api_url' => ['label' => '短信接口地址', 'kind' => 'text', 'placeholder' => 'https://sms.idcbdy.cn/sms'],
                'sms_channel' => ['label' => '短信通道ID', 'kind' => 'text', 'placeholder' => '可选，通道标识 g'],
            ],
        ],
        'logo' => [
            'label' => '网站 Logo 上传',
            'icon' => 'sparkle',
            'desc' => '上传站点 Logo 与浏览器图标，支持 PNG/SVG，不超过 512KB',
            'fields' => [
                'logo_path' => ['label' => '站点 Logo', 'kind' => 'text', 'placeholder' => '/assets/logo.png', 'mono' => true],
                'favicon_path' => ['label' => '浏览器图标', 'kind' => 'text', 'placeholder' => '/assets/favicon.svg', 'mono' => true],
            ],
        ],
        'captcha' => [
            'label' => '图形验证码配置',
            'icon' => 'shield',
            'desc' => 'PuddingCaptcha 人机验证，保护登录注册及短信/邮箱发送安全。前往 <a href=https://captcha.idcbdy.com/ target=_blank>captcha.idcbdy.com</a> 申请 AccessKey 和 Secret',
            'fields' => [
                'captcha_enable' => ['label' => '启用图形验证码', 'kind' => 'bool', 'desc' => '开启后登录/注册/发送验证码前需完成图形人机验证', 'conf' => 'captcha_enable'],
                'captcha_api_url' => ['label' => '验证码网关地址', 'kind' => 'text', 'placeholder' => 'https://captcha.idcbdy.com', 'mono' => true, 'conf' => 'captcha_api_url'],
                'captcha_access_key' => ['label' => 'AccessKey', 'kind' => 'text', 'placeholder' => '用户控制台生成的 AccessKey', 'mono' => true, 'conf' => 'captcha_access_key'],
                'captcha_secret' => ['label' => 'Secret', 'kind' => 'secret', 'placeholder' => '留空不修改', 'conf' => 'captcha_secret'],
                'captcha_type' => ['label' => '验证码类型', 'kind' => 'select', 'options' => [
                    'slider' => '滑块拼图 (slider)',
                    'char' => '字符验证 (char)',
                    'math' => '数学计算 (math)',
                    'cnchar' => '中文选字 (cnchar)',
                    'rotate' => '旋转拼图 (rotate)',
                    'click_order' => '点击排序 (click_order)',
                    'curve_slider' => '曲线滑动 (curve_slider)',
                    'sense' => '无感验证 (sense)',
                    'icon_click' => '图标点击 (icon_click)',
                    'draw_trail' => '手绘轨迹 (draw_trail)',
                    'rope' => '绳索滑动 (rope)',
                    'grid_cover' => '格子覆盖 (grid_cover)',
                    'mirror_text' => '镜像文字 (mirror_text)',
                    'mirror_digit' => '镜像数字 (mirror_digit)',
                    'mask_slider' => '遮罩滑动 (mask_slider)',
                    'text_order' => '语序点击 (text_order)',
                    'shape_fix' => '碎片拼图 (shape_fix)',
                    'dynamic_char' => '动态字符 (dynamic_char)',
                    'clock' => '时钟验证 (clock)',
                    'gear_rotate' => '齿轮旋转 (gear_rotate)',
                    'audio' => '音频验证 (audio)',
                    'morse' => '摩斯密码 (morse)',
                    'calendar' => '日历验证 (calendar)',
                    'dial' => '拨盘验证 (dial)',
                    'pipe' => '管道连接 (pipe)',
                    'wire' => '电路连线 (wire)',
                    'pulse' => '脉冲验证 (pulse)',
                    'sort_part' => '零件排序 (sort_part)',
                    'color_temp' => '色温匹配 (color_temp)',
                    'prism' => '棱镜验证 (prism)',
                    'ballistic' => '弹道验证 (ballistic)',
                    'claw' => '抓取验证 (claw)',
                    'water_temp' => '水温调节 (water_temp)',
                    'shape_dock' => '图形对接 (shape_dock)',
                    'counting' => '计数验证 (counting)',
                    'block_count' => '方块计数 (block_count)',
                ], 'conf' => 'captcha_type'],
                'captcha_mode' => ['label' => '弹出方式', 'kind' => 'select', 'options' => ['popup' => '弹窗式', 'embed' => '嵌入式', 'button' => '按钮触发式'], 'conf' => 'captcha_mode'],
            ],
        ],
        'ip' => [
            'label' => 'IP 地址获取设置',
            'icon' => 'link',
            'desc' => '在使用 CDN 或反向代理时正确识别访客真实 IP',
            'fields' => [
                'ip_mode' => ['label' => '获取方式', 'kind' => 'select', 'options' => ['remote' => '直连（REMOTE_ADDR）', 'header' => '从请求头读取']],
                'ip_header' => ['label' => 'IP 请求头', 'kind' => 'text', 'placeholder' => 'X-Forwarded-For', 'mono' => true],
                'ip_trusted' => ['label' => '受信任代理 IP', 'kind' => 'textarea', 'placeholder' => '每行一个，留空表示不限制'],
            ],
        ],

        'cleanup' => [
            'label' => '数据清理',
            'icon' => 'trash',
            'desc' => '清理过期的授权流程、授权码与日志，操作不可撤销',
            'fields' => [],
            'actions' => ['cleanup_flow', 'cleanup_code', 'cleanup_adminlog', 'cleanup_userlog'],
        ],
        'update' => [
            'label' => '检测更新',
            'icon' => 'refresh',
            'desc' => '查看当前版本与检查是否有新版本',
            'fields' => [],
            'actions' => ['update_check', 'update_run'],
        ],
    ];

    public static function dispatch(string $act): void
    {
        if (pl_demo_on() && in_array($act, ["system.logo.upload", "system.cleanup", "system.update.run"], true)) {
            pl_demo_guard("系统设置");
        }
        switch ($act) {
            case 'system.list':
                self::listGroups();
                break;
            case 'system.get':
                self::get();
                break;
            case 'system.save':
                self::save();
                break;
            case 'system.logo.upload':
                self::logoUpload();
                break;
            case 'system.cleanup':
                self::cleanup();
                break;
            case 'system.update.check':
                self::updateCheck();
                break;
            case 'system.update.run':
                self::updateRun();
                break;
            default:
                pl_err('未知的系统设置接口', -4, 404);
        }
    }

    private static function method(string $expect): void
    {
        if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== $expect) {
            pl_err('请求方式错误', -4, 405);
        }
    }

    private static function groups(): array
    {
        $out = [];
        foreach (self::SCHEMA as $k => $g) {
            $out[] = [
                'key' => $k,
                'label' => $g['label'],
                'icon' => $g['icon'],
                'desc' => $g['desc'],
                'fields' => count($g['fields']),
                'actions' => $g['actions'] ?? [],
            ];
        }
        return $out;
    }

    private static function listGroups(): void
    {
        pl_require_admin();
        pl_ok(['groups' => self::groups(), 'version' => PL_VERSION]);
    }

    private static function values(string $group): array
    {
        $g = self::SCHEMA[$group];
        $out = [];
        foreach ($g['fields'] as $key => $def) {
            $confKey = $def['conf'] ?? ($group . '_' . $key);
            $raw = (string) pl_conf($confKey, '');
            if ($def['kind'] === 'bool') {
                $out[$key] = $raw === '1';
            } elseif ($def['kind'] === 'secret') {
                $out[$key] = $raw === '' ? '' : pl_mask_key($raw);
                $out[$key . '_set'] = $raw !== '';
            } else {
                $out[$key] = $raw;
            }
        }
        return $out;
    }

    private static function get(): void
    {
        pl_require_admin();
        $group = pl_in('group');
        if (!isset(self::SCHEMA[$group])) {
            pl_err('未知的设置分组');
        }
        pl_ok([
            'group' => $group,
            'meta' => [
                'key' => $group,
                'label' => self::SCHEMA[$group]['label'],
                'icon' => self::SCHEMA[$group]['icon'],
                'desc' => self::SCHEMA[$group]['desc'],
                'actions' => self::SCHEMA[$group]['actions'] ?? [],
            ],
            'fields' => self::SCHEMA[$group]['fields'],
            'values' => self::values($group),
        ]);
    }

    private static function save(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $group = pl_in('group');
        if (!isset(self::SCHEMA[$group])) {
            pl_err('未知的设置分组');
        }
        $changed = [];
        if (pl_demo_on()) {
            self::demoOffOnly($group);
        }
        if ($group === "login") {
            self::demoSwitchCheck();
        }
        foreach (self::SCHEMA[$group]['fields'] as $key => $def) {
            $raw = pl_in($key, '__PL_UNSET__');
            if ($raw === '__PL_UNSET__') {
                continue;
            }
            if ($def['kind'] === 'bool') {
                $val = ($raw === '1' || $raw === 'true') ? '1' : '0';
            } elseif ($def['kind'] === 'secret') {
                if ($raw === '' || strpos($raw, '*') !== false) {
                    continue;
                }
                $val = $raw;
            } elseif ($def['kind'] === 'number') {
                if ($raw !== '' && !is_numeric($raw)) {
                    continue;
                }
                $val = $raw === '' ? '' : (string) (int) $raw;
            } else {
                $limit = $def['kind'] === 'textarea' ? 2000 : 255;
                $val = mb_substr($raw, 0, $limit);
            }
            if (($def["conf"] ?? "") === "demo_password") {
                if (mb_strlen($val) < 6) {
                    pl_err("演示密码至少 6 位");
                }
                $val = password_hash($val, PASSWORD_BCRYPT);
            }
            $confKey = $def['conf'] ?? ($group . '_' . $key);
            $old = (string) pl_conf($confKey, '');
            if ($old !== $val) {
                pl_conf_set($confKey, $val);
                $changed[] = $key;
            }
        }
        if ($changed !== []) {
            pl_admin_log((int) $admin['uid'], 'system.save', $group . '：' . implode(',', $changed));
        }
        pl_ok(['changed' => $changed], $changed === [] ? '没有需要保存的变更' : '设置已保存并立即生效');
    }

    /**
     * 演示模式下仅允许修改演示开关与演示密码，其余字段按只读拒绝。
     */
    private static function demoOffOnly(string $group): void
    {
        $allow = ['test_open', 'demo_password'];
        foreach (self::SCHEMA[$group]['fields'] as $fk => $fd) {
            if (in_array($fk, $allow, true)) {
                continue;
            }
            $raw = pl_in($fk, '__PL_UNSET__');
            if ($raw === '__PL_UNSET__') {
                continue;
            }
            if ($fd['kind'] === 'bool') {
                $val = ($raw === '1' || $raw === 'true') ? '1' : '0';
            } elseif ($fd['kind'] === 'secret') {
                if ($raw === '' || strpos($raw, '*') !== false) {
                    continue;
                }
                $val = $raw;
            } elseif ($fd['kind'] === 'number') {
                if ($raw !== '' && !is_numeric($raw)) {
                    continue;
                }
                $val = $raw === '' ? '' : (string) (int) $raw;
            } else {
                $limit = $fd['kind'] === 'textarea' ? 2000 : 255;
                $val = mb_substr($raw, 0, $limit);
            }
            $confKey = $fd['conf'] ?? ($group . '_' . $fk);
            if ((string) pl_conf($confKey, '') !== $val) {
                pl_demo_guard(self::SCHEMA[$group]['label']);
            }
        }
    }
    /**
     * 演示开关校验：开启前须设置不少于 6 位演示密码，关闭时须输入正确演示密码。
     */
    private static function demoSwitchCheck(): void
    {
        $raw = pl_in("test_open", "__PL_UNSET__");
        if ($raw === "__PL_UNSET__") {
            return;
        }
        $wantOn = ($raw === "1" || $raw === "true");
        if ($wantOn) {
            if (pl_demo_password_hash() === "" && mb_strlen(pl_in("demo_password")) < 6) {
                pl_err("开启演示模式前请先设置不少于 6 位的演示密码");
            }
            return;
        }
        if (!pl_demo_on()) {
            return;
        }
        $hash = pl_demo_password_hash();
        if ($hash === "") {
            return;
        }
        if (!password_verify(pl_in("demo_password"), $hash)) {
            pl_err("演示密码不正确，无法关闭演示模式");
        }
    }
    private static function logoUpload(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            pl_err('未收到上传文件');
        }
        $f = $_FILES['file'];
        if ((int) $f['error'] !== 0) {
            pl_err('上传失败，错误码 ' . (int) $f['error']);
        }
        if ((int) $f['size'] > 512 * 1024) {
            pl_err('文件超过 512KB 限制');
        }
        $tmp = (string) $f['tmp_name'];
        $mime = function_exists('mime_content_type') ? (string) mime_content_type($tmp) : '';
        $allow = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/svg+xml' => 'svg', 'image/webp' => 'webp', 'image/x-icon' => 'ico', 'image/vnd.microsoft.icon' => 'ico'];
        if (!isset($allow[$mime])) {
            pl_err('仅支持 PNG / JPEG / SVG / WEBP / ICO');
        }
        $kind = pl_in('kind', 'logo');
        if (!in_array($kind, ['logo', 'favicon'], true)) {
            $kind = 'logo';
        }
        $dir = PL_ROOT . '/assets/upload';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            pl_err('无法创建上传目录');
        }
        $name = $kind . '-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $allow[$mime];
        $dest = $dir . '/' . $name;
        if (!move_uploaded_file($tmp, $dest)) {
            pl_err('文件写入失败');
        }
        @chmod($dest, 0644);
        $path = '/assets/upload/' . $name;
        pl_conf_set('logo_' . $kind . '_path', $path);
        pl_admin_log((int) $admin['uid'], 'system.logo', $kind . ' -> ' . $path);
        pl_ok(['path' => $path, 'kind' => $kind], '上传成功');
    }

    private static function cleanup(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $target = pl_in('target');
        $pdo = pl_pdo();
        $now = time();
        $deleted = 0;
        switch ($target) {
            case 'flow':
                $deleted = $pdo->prepare('DELETE FROM pl_connect_flow WHERE expire < ?');
                $deleted->execute([$now]);
                $deleted = $deleted->rowCount();
                break;
            case 'code':
                $st = $pdo->prepare('DELETE FROM pl_connect_code WHERE expire < ?');
                $st->execute([$now - 86400]);
                $deleted = $st->rowCount();
                break;
            case 'adminlog':
                $days = max(1, (int) pl_in('days', '90'));
                $st = $pdo->prepare('DELETE FROM pl_adminlog WHERE date < ?');
                $st->execute([date('Y-m-d H:i:s', time() - $days * 86400)]);
                $deleted = $st->rowCount();
                break;
            case 'userlog':
                $days = max(1, (int) pl_in('days', '90'));
                $st = $pdo->prepare('DELETE FROM pl_userlog WHERE date < ?');
                $st->execute([date('Y-m-d H:i:s', time() - $days * 86400)]);
                $deleted = $st->rowCount();
                break;
            default:
                pl_err('未知的清理目标');
        }
        pl_admin_log((int) $admin['uid'], 'system.cleanup', $target . '：删除 ' . $deleted . ' 行');
        pl_ok(['target' => $target, 'deleted' => $deleted], '已清理 ' . $deleted . ' 条记录');
    }

    private static function updateCheck(): void
    {
        pl_require_admin();
        $latest = PL_VERSION;
        $remoteError = '';
        $raw = self::httpGet('https://gitee.com/budingyun6/puddinglogin-v2/raw/master/app/core.php', 8);
        if ($raw === '') {
            $remoteError = '无法连接 Gitee，版本检测结果仅供本地参考';
        } elseif (preg_match("/const PL_VERSION = '([0-9.]+)'/", $raw, $m)) {
            $latest = $m[1];
        } else {
            $remoteError = '远端版本号解析失败';
        }
        $pdo = pl_pdo();
        $stats = [
            'version' => PL_VERSION,
            'php' => PHP_VERSION,
            'users' => (int) $pdo->query('SELECT COUNT(*) FROM pl_user')->fetchColumn(),
            'apps' => (int) $pdo->query('SELECT COUNT(*) FROM pl_apps')->fetchColumn(),
            'accounts' => (int) $pdo->query('SELECT COUNT(*) FROM pl_accounts')->fetchColumn(),
            'platforms' => (int) $pdo->query('SELECT COUNT(*) FROM pl_platform')->fetchColumn(),
            'opened' => (int) $pdo->query('SELECT COUNT(*) FROM pl_platform WHERE status = 1')->fetchColumn(),
        ];
        $writable = is_writable(PL_ROOT . '/storage') ? '可写' : '不可写';
        pl_ok([
            'local' => $stats,
            'checks' => [
                ['name' => '数据库连接', 'ok' => true, 'detail' => '连接正常'],
                ['name' => '存储目录', 'ok' => is_writable(PL_ROOT . '/storage'), 'detail' => 'storage 目录' . $writable],
                ['name' => '前端资源', 'ok' => is_file(PL_ROOT . '/assets/app.js'), 'detail' => is_file(PL_ROOT . '/assets/app.js') ? 'app.js 已构建' : 'app.js 缺失'],
                ['name' => 'PHP 版本', 'ok' => version_compare(PHP_VERSION, '8.0.0', '>='), 'detail' => '当前 ' . PHP_VERSION],
            ],
            'latest' => $latest,
            'has_update' => version_compare($latest, PL_VERSION, '>'),
            'remote_error' => $remoteError,
            'checked_at' => pl_now(),
        ]);
    }

    /**
     * 轻量 HTTP GET，失败返回空串
     */
    private static function httpGet(string $url, int $timeout = 10): string
    {
        if (!function_exists('curl_init')) {
            return '';
        }
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, min(5, $timeout));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'PuddingLogin/' . PL_VERSION);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($body !== false && $code === 200) ? (string) $body : '';
    }

    /**
     * 在线更新：下载 Gitee master 归档并覆盖代码，storage 与 .git 保持不动
     */
    private static function updateRun(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        if (pl_demo_on()) {
            pl_demo_guard('在线更新');
        }
        if (!class_exists('PharData')) {
            pl_err('当前 PHP 环境不支持 PharData，无法解压更新包');
        }
        if (!is_writable(PL_ROOT)) {
            pl_err('站点根目录不可写，无法执行更新');
        }
        $work = PL_ROOT . '/storage/update_' . date('YmdHis') . '_' . mt_rand(1000, 9999);
        if (!@mkdir($work, 0755, true)) {
            pl_err('无法创建临时目录');
        }
        $tar = $work . '/master.tar.gz';
        $url = 'https://gitee.com/budingyun6/puddinglogin-v2/repository/archive/master.tar.gz';
        $fp = @fopen($tar, 'wb');
        if (!$fp) {
            self::rrmdir($work);
            pl_err('无法写入更新包');
        }
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 180);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'PuddingLogin/' . PL_VERSION);
        $ok = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        fclose($fp);
        if (!$ok || $code !== 200 || !is_file($tar) || filesize($tar) < 1024) {
            self::rrmdir($work);
            pl_err('下载更新包失败：' . ($err !== '' ? $err : 'HTTP ' . $code));
        }
        try {
            $phar = new \PharData($tar);
            $phar->extractTo($work, null, true);
            unset($phar);
        } catch (Throwable $e) {
            self::rrmdir($work);
            pl_err('解压更新包失败：' . $e->getMessage());
        }
        $src = '';
        foreach ((array) @scandir($work) as $d) {
            if ($d === '.' || $d === '..') continue;
            if (is_dir($work . '/' . $d) && is_file($work . '/' . $d . '/app/core.php')) {
                $src = $work . '/' . $d;
                break;
            }
        }
        if ($src === '') {
            self::rrmdir($work);
            pl_err('更新包结构异常，未找到 app/core.php');
        }
        $newVersion = '';
        $core = @file_get_contents($src . '/app/core.php');
        if (is_string($core) && preg_match("/const PL_VERSION = '([0-9.]+)'/", $core, $m)) {
            $newVersion = $m[1];
        }
        $skip = ['storage', '.git'];
        self::syncDir($src, PL_ROOT, $skip);
        self::rrmdir($work);
        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }
        clearstatcache(true);
        pl_admin_log((int) $admin['uid'], 'system.update', '在线更新至 ' . ($newVersion !== '' ? $newVersion : '未知版本'));
        pl_ok([
            'version_before' => PL_VERSION,
            'version_after' => $newVersion,
            'files_synced' => true,
        ], '更新完成' . ($newVersion !== '' ? '，当前版本 ' . $newVersion : '，请刷新页面查看'));
    }

    private static function syncDir(string $src, string $dst, array $skip): void
    {
        $items = @scandir($src);
        if (!$items) return;
        foreach ($items as $it) {
            if ($it === '.' || $it === '..') continue;
            if (in_array($it, $skip, true)) continue;
            $sp = $src . '/' . $it;
            $dp = $dst . '/' . $it;
            if (is_dir($sp)) {
                if (!is_dir($dp)) @mkdir($dp, 0755, true);
                self::syncDir($sp, $dp, $skip);
            } elseif (is_file($sp)) {
                @copy($sp, $dp);
                @chmod($dp, 0644);
            }
        }
    }

    private static function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = @scandir($dir);
        if ($items) {
            foreach ($items as $it) {
                if ($it === '.' || $it === '..') continue;
                $p = $dir . '/' . $it;
                if (is_dir($p)) self::rrmdir($p);
                else @unlink($p);
            }
        }
        @rmdir($dir);
    }
}

