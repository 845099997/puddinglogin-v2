<?php
declare(strict_types=1);

define('PL_ROOT', dirname(__DIR__));
// 数据库与系统密钥：读取安装向导生成的 storage/database.php，仓库内不内置任何数据库口令
$plDbFile = PL_ROOT . '/storage/database.php';
$plDbConf = is_file($plDbFile) ? (array) require $plDbFile : [];
define('PL_DB_HOST', (string) ($plDbConf['host'] ?? '127.0.0.1'));
define('PL_DB_PORT', (string) ($plDbConf['port'] ?? '3306'));
define('PL_DB_NAME', (string) ($plDbConf['name'] ?? 'puddinglogin'));
define('PL_DB_USER', (string) ($plDbConf['user'] ?? 'puddinglogin'));
define('PL_DB_PASS', (string) ($plDbConf['pass'] ?? ''));
// 系统密钥：由安装向导随机生成；缺失时自动生成并写入 storage/sys_key.txt，避免所有部署共用同一密钥
$plSysKey = trim((string) ($plDbConf['sys_key'] ?? ''));
if ($plSysKey === '') {
    $plKeyFile = PL_ROOT . '/storage/sys_key.txt';
    if (is_file($plKeyFile)) {
        $plSysKey = trim((string) @file_get_contents($plKeyFile));
    }
    if ($plSysKey === '') {
        $plSysKey = 'pl-' . bin2hex(random_bytes(16));
        @file_put_contents($plKeyFile, $plSysKey, LOCK_EX);
        @chmod($plKeyFile, 0640);
    }
    unset($plKeyFile);
}
define('PL_SYS_KEY', $plSysKey);
unset($plDbFile, $plDbConf, $plSysKey);
// 版本号规则：三段式 主.次.修订，修订位满 9 进 1（2.0.9 → 2.1.0，2.9.9 → 3.0.0）
// 每次功能更新或新增修改都必须递增此版本号。
const PL_VERSION = '2.1.5';

date_default_timezone_set('Asia/Shanghai');
mb_internal_encoding('UTF-8');

function pl_pdo(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . PL_DB_HOST . ';port=' . PL_DB_PORT . ';dbname=' . PL_DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, PL_DB_USER, PL_DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function pl_conf_cache(?array $replace = null): array
{
    static $cache = null;
    if ($replace !== null) {
        $cache = $replace;
        return $cache;
    }
    if ($cache === null) {
        $cache = [];
        try {
            $stmt = pl_pdo()->query('SELECT k, v FROM pl_config');
            foreach ($stmt as $row) {
                $cache[$row['k']] = $row['v'];
            }
        } catch (Throwable $e) {
            $cache = [];
        }
    }
    return $cache;
}

function pl_conf(string $key, $default = null)
{
    $cache = pl_conf_cache();
    return array_key_exists($key, $cache) ? $cache[$key] : $default;
}

function pl_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('PLSESSION');
    session_set_cookie_params([
        'lifetime' => 604800,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => $https,
    ]);
    session_start();
}

function pl_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pl_ok($data = [], string $msg = 'ok'): void
{
    pl_json(['code' => 0, 'msg' => $msg, 'data' => $data]);
}

function pl_err(string $msg, int $code = -1, int $status = 200, array $extra = []): void
{
    pl_json(array_merge(['code' => $code, 'msg' => $msg], $extra), $status);
}

function pl_input(): array
{
    static $data = null;
    if ($data !== null) {
        return $data;
    }
    $data = array_merge($_GET, $_POST);
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $json = json_decode((string) $raw, true);
        if (is_array($json)) {
            $data = array_merge($data, $json);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
        $raw = file_get_contents('php://input');
        parse_str((string) $raw, $parsed);
        if (is_array($parsed)) {
            $data = array_merge($data, $parsed);
        }
    }
    return $data;
}

function pl_in(string $key, string $default = ''): string
{
    $v = pl_input()[$key] ?? $default;
    if (is_array($v)) {
        return $default;
    }
    return trim((string) $v);
}

function pl_csrf(): string
{
    pl_session();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf_token'];
}

function pl_check_csrf(): void
{
    pl_session();
    $token = pl_in('csrf_token');
    if ($token === '' || empty($_SESSION['csrf_token']) || !hash_equals((string) $_SESSION['csrf_token'], $token)) {
        pl_err('CSRF TOKEN ERROR', -1, 200, ['errcode' => 403]);
    }
}

function pl_ip_trusted(string $ip, string $list): bool
{
    foreach (preg_split('/[\s,]+/', $list) ?: [] as $item) {
        $item = trim($item);
        if ($item === '') {
            continue;
        }
        if ($item === $ip) {
            return true;
        }
        if (strpos($item, '/') === false) {
            continue;
        }
        [$subnet, $bits] = array_pad(explode('/', $item, 2), 2, '');
        $bits = (int) $bits;
        $ipBin = @inet_pton($ip);
        $netBin = @inet_pton((string) $subnet);
        if ($ipBin === false || $netBin === false || strlen($ipBin) !== strlen($netBin)) {
            continue;
        }
        $maxBits = strlen($ipBin) * 8;
        if ($bits < 0 || $bits > $maxBits) {
            continue;
        }
        $bytes = intdiv($bits, 8);
        $rem = $bits % 8;
        if ($bytes > 0 && substr($ipBin, 0, $bytes) !== substr($netBin, 0, $bytes)) {
            continue;
        }
        if ($rem === 0) {
            return true;
        }
        $mask = (0xFF << (8 - $rem)) & 0xFF;
        if ((ord($ipBin[$bytes]) & $mask) === (ord($netBin[$bytes]) & $mask)) {
            return true;
        }
    }
    return false;
}
function pl_client_ip(): string
{
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    // 默认直连模式，只信任 REMOTE_ADDR，避免客户端伪造 X-Forwarded-For 绕过验证码限流与登录日志；
    // 部署在 CDN / 反向代理之后时，在后台「IP 地址获取设置」选择「从请求头读取」并填写请求头与受信任代理
    $mode = (string) pl_conf('ip_ip_mode', '');
    if ($mode === '' && (string) pl_conf('trust_proxy', '0') === '1') {
        $mode = 'header';
    }
    if ($mode !== 'header') {
        return $remote;
    }
    // 受信任代理白名单（支持 CIDR）：留空表示不限制，仅建议在出口地址固定时留空
    $trusted = trim((string) pl_conf('ip_ip_trusted', ''));
    if ($trusted !== '' && !pl_ip_trusted($remote, $trusted)) {
        return $remote;
    }
    $header = strtoupper(str_replace('-', '_', trim((string) pl_conf('ip_ip_header', ''))));
    if ($header === '') {
        $header = 'X_FORWARDED_FOR';
    }
    if (strpos($header, 'HTTP_') !== 0) {
        $header = 'HTTP_' . $header;
    }
    $raw = (string) ($_SERVER[$header] ?? '');
    // 从右向左跳过受信任代理，取第一个非代理地址，降低伪造前缀的影响
    foreach (array_reverse(explode(',', $raw)) as $candidate) {
        $ip = trim($candidate);
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            continue;
        }
        if ($trusted !== '' && pl_ip_trusted($ip, $trusted)) {
            continue;
        }
        return $ip;
    }
    return $remote;
}

function pl_current_uid(): int
{
    pl_session();
    return isset($_SESSION['uid']) ? (int) $_SESSION['uid'] : 0;
}

function pl_current_user(): ?array
{
    static $user = null;
    $uid = pl_current_uid();
    if ($uid <= 0) {
        return null;
    }
    if ($user !== null && (int) $user['uid'] === $uid) {
        return $user;
    }
    $stmt = pl_pdo()->prepare('SELECT * FROM pl_user WHERE uid = ? LIMIT 1');
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    $user = $row ?: null;
    return $user;
}

function pl_require_login(): array
{
    $user = pl_current_user();
    if (!$user || (int) $user['status'] === 0) {
        pl_err('请先登录', -2, 200);
    }
    return $user;
}

function pl_login_user(int $uid): void
{
    pl_session();
    $_SESSION['uid'] = $uid;
    session_regenerate_id(true);
    $_SESSION['uid'] = $uid;
}

function pl_logout_user(): void
{
    pl_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 604800, $p['path'], $p['domain'], (bool) $p['secure'], (bool) $p['httponly']);
    }
    session_destroy();
}

function pl_hash_pwd(string $pwd): string
{
    return password_hash($pwd, PASSWORD_DEFAULT);
}

function pl_verify_pwd(string $pwd, string $hash): bool
{
    return password_verify($pwd, $hash);
}

function pl_valid_username(string $u): bool
{
    $len = mb_strlen($u);
    if ($len < 3 || $len > 32) {
        return false;
    }
    if (preg_match('/\s/u', $u) || strpbrk($u, "<>\"'&\\/@") !== false) {
        return false;
    }
    return true;
}
function pl_valid_pwd(string $pwd, string $username = ''): bool
{
    $len = strlen($pwd);
    if ($len < 6 || $len > 64) {
        return false;
    }
    if (ctype_digit($pwd)) {
        return false;
    }
    if ($username !== '' && strcasecmp($pwd, $username) === 0) {
        return false;
    }
    return true;
}

function pl_valid_email(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function pl_valid_phone(string $phone): bool
{
    return (bool) preg_match('/^1\\d{10}$/', $phone);
}

function pl_now(): string
{
    return date('Y-m-d H:i:s');
}

function pl_user_public(array $u): array
{
    return [
        'uid' => (int) $u['uid'],
        'username' => $u['username'],
        'nickname' => $u['nickname'] ?: $u['username'],
        'email' => $u['email'],
        'phone' => $u['phone'] ? substr_replace($u['phone'], '****', 3, 4) : '',
        'avatar' => $u['avatar'],
        'money' => (float) $u['money'],
        'gid' => (int) $u['gid'],
        'status' => (int) $u['status'],
        'is_admin' => (int) ($u['is_admin'] ?? 0),
        'addtime' => $u['addtime'],
        'lasttime' => $u['lasttime'],
        'lastip' => $u['lastip'],
        'bound' => [
            'qq' => (string) ($u['qq_uid'] ?? '') !== '',
            'wx' => (string) ($u['wx_uid'] ?? '') !== '',
            'alipay' => (string) ($u['alipay_uid'] ?? '') !== '',
        ],
    ];
}

function pl_platforms(): array
{
    return [
        'qq' => ['name' => 'QQ', 'color' => '#12b7f5', 'icon' => 'qq', 'group' => 'cn', 'link' => 'https://connect.qq.com/'],
        'wx' => ['name' => '微信', 'color' => '#07c160', 'icon' => 'wechat', 'group' => 'cn', 'link' => 'https://open.weixin.qq.com/'],
        'alipay' => ['name' => '支付宝', 'color' => '#1677ff', 'icon' => 'alipay', 'group' => 'cn', 'link' => 'https://open.alipay.com/'],
        'baidu' => ['name' => '百度', 'color' => '#2932e1', 'icon' => 'baidu', 'group' => 'cn', 'link' => 'https://developer.baidu.com/'],
        'sina' => ['name' => '微博', 'color' => '#e6162d', 'icon' => 'weibo', 'group' => 'cn', 'link' => 'https://open.weibo.com/'],
        'dingtalk' => ['name' => '钉钉', 'color' => '#0089ff', 'icon' => 'dingtalk', 'group' => 'cn', 'link' => 'https://open.dingtalk.com/'],
        'xiaomi' => ['name' => '小米', 'color' => '#ff6700', 'icon' => 'xiaomi', 'group' => 'cn', 'link' => 'https://dev.mi.com/'],
        'huawei' => ['name' => '华为', 'color' => '#cf0a2c', 'icon' => 'huawei', 'group' => 'cn', 'link' => 'https://developer.huawei.com/'],
        'github' => ['name' => 'GitHub', 'color' => '#24292f', 'icon' => 'github', 'group' => 'dev', 'link' => 'https://github.com/settings/developers'],
        'gitee' => ['name' => 'Gitee', 'color' => '#c71d23', 'icon' => 'gitee', 'group' => 'dev', 'link' => 'https://gitee.com/oauth/applications'],
        'google' => ['name' => 'Google', 'color' => '#4285f4', 'icon' => 'google', 'group' => 'global', 'link' => 'https://console.cloud.google.com/'],
        'facebook' => ['name' => 'Facebook', 'color' => '#1877f2', 'icon' => 'facebook', 'group' => 'global', 'link' => 'https://developers.facebook.com/'],
        'twitter' => ['name' => 'X', 'color' => '#0f1419', 'icon' => 'twitter', 'group' => 'global', 'link' => 'https://developer.twitter.com/'],
        'microsoft' => ['name' => 'Microsoft', 'color' => '#00a4ef', 'icon' => 'microsoft', 'group' => 'global', 'link' => 'https://portal.azure.com/'],
        'puddingchat' => ['name' => '自定义 OAuth', 'color' => '#a78bfa', 'icon' => 'sparkle', 'group' => 'custom', 'link' => 'https://sdk.idcbdy.com/'],
    ];
}

function pl_platform_rows(): array
{
    $static = pl_platforms();
    $rows = [];
    try {
        $list = pl_pdo()->query('SELECT type, showname, mode, status, sort, official_link, note FROM pl_platform ORDER BY sort ASC, type ASC')->fetchAll();
    } catch (Throwable $e) {
        $list = [];
    }
    foreach ($list as $r) {
        $type = (string) $r['type'];
        $base = $static[$type] ?? ['name' => $type, 'color' => '#8a8fab', 'icon' => 'link', 'group' => 'custom', 'link' => ''];
        $mode = (string) $r['mode'];
        $appid = (string) pl_conf('oauth_' . $type . '_appid', '');
        $appkey = (string) pl_conf('oauth_' . $type . '_appkey', '');
        $configured = $appid !== '' && $appkey !== '';
        if ($mode === 'rainbow') {
            $configured = (string) pl_conf('rainbow_api', '') !== ''
                && (string) pl_conf('rainbow_appid', '') !== ''
                && (string) pl_conf('rainbow_appkey', '') !== '';
        }
        $rows[] = [
            'type' => $type,
            'name' => (string) $r['showname'],
            'showname' => (string) $r['showname'],
            'color' => $base['color'],
            'icon' => $base['icon'],
            'group' => $base['group'],
            'mode' => $mode,
            'status' => (int) $r['status'],
            'sort' => (int) $r['sort'],
            'link' => (string) ($r['official_link'] !== '' ? $r['official_link'] : $base['link']),
            'note' => (string) ($r['note'] ?? ''),
            'configured' => $configured,
            'enabled' => (int) $r['status'] === 1 && ($mode === 'system' || $configured),
        ];
    }
    if ($rows === []) {
        foreach ($static as $k => $v) {
            $appid = (string) pl_conf('oauth_' . $k . '_appid', '');
            $appkey = (string) pl_conf('oauth_' . $k . '_appkey', '');
            $rows[] = [
                'type' => $k,
                'name' => $v['name'],
                'showname' => $v['name'],
                'color' => $v['color'],
                'icon' => $v['icon'],
                'group' => $v['group'],
                'mode' => 'official',
                'status' => 0,
                'sort' => 0,
                'link' => $v['link'],
                'note' => '',
                'configured' => $appid !== '' && $appkey !== '',
                'enabled' => false,
            ];
        }
    }
    return $rows;
}

function pl_platform_row(string $type): ?array
{
    foreach (pl_platform_rows() as $r) {
        if ($r['type'] === $type) {
            return $r;
        }
    }
    return null;
}

function pl_login_types(): array
{
    $out = [];
    foreach (pl_platform_rows() as $r) {
        $out[] = [
            'type' => $r['type'],
            'name' => $r['name'],
            'color' => $r['color'],
            'icon' => $r['icon'],
            'group' => $r['group'],
            'mode' => $r['mode'],
            'configured' => $r['configured'],
            'enabled' => $r['enabled'],
        ];
    }
    return $out;
}

function pl_site_public(): array
{
    return [
        'sitename' => pl_conf('sitename', 'PuddingLogin'),
        'title' => pl_conf('title', 'PuddingLogin'),
        'keywords' => pl_conf('keywords', ''),
        'description' => pl_conf('description', ''),
        'reg_open' => (int) pl_conf('reg_open', '1') === 1,
        'reg_channel' => (string) pl_conf('reg_channel', 'both'),
        'captcha_open_login' => (int) pl_conf('captcha_open_login', '0') === 1,
        'test_open' => (int) pl_conf('test_open', '0') === 1,
        'quick' => [
            'puddingchat' => (int) pl_conf('quick_puddingchat', '0') === 1,
            'qq' => (int) pl_conf('quick_qq', '0') === 1,
            'wx' => (int) pl_conf('quick_wx', '0') === 1,
            'alipay' => (int) pl_conf('quick_alipay', '0') === 1,
        ],
        'default_appid' => (string) pl_conf('default_appid', ''),
        'kfqq' => pl_conf('kfqq', ''),
        'kfemail' => pl_conf('kfemail', ''),
        'icp' => pl_conf('site_icp', ''),
        'footer' => pl_conf('site_footer', ''),
        'siteurl' => pl_conf('siteurl', ''),
        'version' => PL_VERSION,
        'logo_path' => pl_conf('logo_path', '/logo.png'),
        'favicon_path' => pl_conf('favicon_path', '/favicon.ico'),
        'types' => pl_login_types(),
    ];
}

function pl_record_log(int $uid, string $type, array $extra = []): void
{
    $appid = (string) ($extra['appid'] ?? '');
    $socialUid = (string) ($extra['social_uid'] ?? '');
    $domain = (string) ($extra['domain'] ?? '');
    $way = (string) ($extra['way'] ?? '');
    $stmt = pl_pdo()->prepare('INSERT INTO pl_userlog (uid, type, date, ip, ua, appid, social_uid, domain, way) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$uid, $type, pl_now(), pl_client_ip(), mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 240), $appid, $socialUid, $domain, $way]);
}

function pl_code_type(string $purpose, string $channel): int
{
    $p = $purpose === 'reset' ? 1 : 0;
    $c = $channel === 'phone' ? 1 : 0;
    return $p * 2 + $c;
}

function pl_issue_code(string $purpose, string $channel, string $target): array
{
    $pdo = pl_pdo();
    $type = pl_code_type($purpose, $channel);
    $since = time() - 60;
    $stmt = $pdo->prepare('SELECT id FROM pl_regcode WHERE target = ? AND type = ? AND time > ? LIMIT 1');
    $stmt->execute([$target, $type, $since]);
    if ($stmt->fetch()) {
        return [false, '请求过于频繁，请 60 秒后再试'];
    }
    $code = (string) random_int(100000, 999999);
    $stmt = $pdo->prepare('INSERT INTO pl_regcode (type, code, target, time, ip, status) VALUES (?, ?, ?, ?, ?, 0)');
    $stmt->execute([$type, $code, $target, time(), pl_client_ip()]);
    return [true, $code];
}

function pl_verify_code(string $purpose, string $channel, string $target, string $code): bool
{
    if ($code === '') {
        return false;
    }
    $type = pl_code_type($purpose, $channel);
    $stmt = pl_pdo()->prepare('SELECT id FROM pl_regcode WHERE type = ? AND target = ? AND code = ? AND status = 0 AND time > ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$type, $target, $code, time() - 3600]);
    $row = $stmt->fetch();
    if (!$row) {
        return false;
    }
    $upd = pl_pdo()->prepare('UPDATE pl_regcode SET status = 1 WHERE id = ?');
    $upd->execute([(int) $row['id']]);
    return true;
}
function pl_app_public(array $a): array
{
    return [
        'id' => (int) $a['id'],
        'appid' => $a['appid'],
        'appkey' => $a['appkey'],
        'name' => $a['name'],
        'type' => $a['type'],
        'types' => array_values(array_filter(array_map('trim', explode(',', (string) ($a['types'] ?? ''))))),
        'status' => (int) $a['status'],
        'domain_limit' => (int) $a['domain_limit'],
        'addtime' => $a['addtime'],
    ];
}

function pl_is_admin(array $u): bool
{
    return (int) ($u['is_admin'] ?? 0) === 1;
}

function pl_require_admin(): array
{
    $user = pl_require_login();
    if (!pl_is_admin($user)) {
        pl_err('无权访问管理后台', -3, 200);
    }
    return $user;
}

function pl_conf_set(string $key, string $value): void
{
    $stmt = pl_pdo()->prepare('INSERT INTO pl_config (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
    $stmt->execute([$key, $value]);
    // 写入数据库后同步进程内缓存，避免同一请求后续读取仍拿到旧值
    $cache = pl_conf_cache();
    $cache[$key] = $value;
    pl_conf_cache($cache);
}

function pl_admin_log(int $uid, string $action, string $detail = '', string $target = ''): void
{
    $stmt = pl_pdo()->prepare('INSERT INTO pl_adminlog (uid, action, detail, target, date, ip) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $uid,
        $action,
        mb_substr($detail, 0, 500),
        mb_substr($target, 0, 128),
        pl_now(),
        pl_client_ip(),
    ]);
}

function pl_mask_key(string $key): string
{
    $len = strlen($key);
    if ($len === 0) {
        return '';
    }
    if ($len <= 8) {
        return str_repeat('*', $len);
    }
    return substr($key, 0, 4) . str_repeat('*', 8) . substr($key, -4);
}

function pl_self_base(): string
{
    $conf = rtrim((string) pl_conf('siteurl', ''), '/');
    if ($conf !== '') {
        return $conf;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    return ($https ? 'https://' : 'http://') . $host;
}

/**
 * 生成快捷登录待注册凭据：未绑定账号时不再自动建号，改为把第三方资料签名为一次性票据，
 * 由用户在前台注册页自行设置账号信息后完成绑定。
 */
function pl_oauth_ticket(array $payload, int $ttl = 600): string
{
    $payload['exp'] = time() + $ttl;
    $payload['nonce'] = bin2hex(random_bytes(8));
    $json = (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $body = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    return $body . '.' . hash_hmac('sha256', $body, PL_SYS_KEY);
}

function pl_oauth_ticket_verify(string $ticket): ?array
{
    $parts = explode('.', $ticket);
    if (count($parts) !== 2) {
        return null;
    }
    [$body, $mac] = $parts;
    if ($body === '' || !hash_equals(hash_hmac('sha256', $body, PL_SYS_KEY), $mac)) {
        return null;
    }
    $pad = (4 - strlen($body) % 4) % 4;
    $json = base64_decode(strtr($body . str_repeat('=', $pad), '-_', '+/'), true);
    if ($json === false) {
        return null;
    }
    $data = json_decode($json, true);
    if (!is_array($data) || (int) ($data['exp'] ?? 0) < time()) {
        return null;
    }
    if ((string) ($data['type'] ?? '') === '' || (string) ($data['social_uid'] ?? '') === '') {
        return null;
    }
    return $data;
}

function pl_mail_send(array $opt): array
{
    $host = trim((string) ($opt['host'] ?? ''));
    $port = (int) ($opt['port'] ?? 465);
    $user = trim((string) ($opt['user'] ?? ''));
    $pass = (string) ($opt['pass'] ?? '');
    $from = trim((string) ($opt['from'] ?? ''));
    $fromName = trim((string) ($opt['from_name'] ?? ''));
    $to = trim((string) ($opt['to'] ?? ''));
    $subject = (string) ($opt['subject'] ?? '');
    $html = (string) ($opt['body'] ?? '');
    $timeout = (int) ($opt['timeout'] ?? 15);
    if ($host === '' || $user === '' || $pass === '' || !pl_valid_email($to)) {
        return ['ok' => false, 'error' => 'SMTP 配置不完整或收件地址无效'];
    }
    if (!pl_valid_email($from)) {
        $from = $user;
    }
    if ($timeout < 5) {
        $timeout = 5;
    }
    $crlf = "\r\n";
    $scheme = $port === 465 ? 'ssl' : 'tcp';
    $errno = 0;
    $errstr = '';
    $streamCtx = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'SNI_enabled' => true,
            'peer_name' => $host,
        ],
    ]);
    $fp = @stream_socket_client($scheme . '://' . $host . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $streamCtx);
    if (!is_resource($fp)) {
        return ['ok' => false, 'error' => '连接 ' . $host . ':' . $port . ' 失败（' . ($errstr !== '' ? $errstr : 'errno ' . $errno) . '）'];
    }
    stream_set_timeout($fp, $timeout);
    $readResp = function () use ($fp): array {
        $raw = '';
        while (($line = fgets($fp, 2048)) !== false) {
            $raw .= $line;
            if (strlen($line) < 4 || substr($line, 3, 1) !== '-') {
                break;
            }
        }
        if ($raw === '') {
            return [0, '连接已断开'];
        }
        return [(int) substr(ltrim($raw), 0, 3), trim($raw)];
    };
    $talk = function (string $line, array $expect) use ($fp, $readResp, $crlf): array {
        if (@fwrite($fp, $line . $crlf) === false) {
            return [false, 0, '写入失败'];
        }
        [$code, $resp] = $readResp();
        return [in_array($code, $expect, true), $code, $resp];
    };
    [$code, $greet] = $readResp();
    $fail = '';
    if ($code !== 220) {
        $fail = '服务器未就绪：' . $greet;
    }
    $helo = 'EHLO puddinglogin';
    if ($fail === '') {
        [$ok, $hc, $hresp] = $talk($helo, [250]);
        if (!$ok) {
            [$ok, $hc, $hresp] = $talk('HELO puddinglogin', [250]);
            if (!$ok) {
                $fail = 'EHLO 失败：' . $hresp;
            }
        }
    }
    if ($fail === '' && $scheme === 'tcp') {
        [$ok, $sc, $sresp] = $talk('STARTTLS', [220]);
        if (!$ok) {
            $fail = 'STARTTLS 被拒绝：' . $sresp;
        } elseif (@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
            $fail = 'TLS 加密协商失败';
        } else {
            [$ok, $hc, $hresp] = $talk($helo, [250]);
            if (!$ok) {
                $fail = '加密后 EHLO 失败：' . $hresp;
            }
        }
    }
    if ($fail === '') {
        [$ok, $ac, $aresp] = $talk('AUTH LOGIN', [334]);
        if (!$ok) {
            $fail = '服务器不支持 AUTH LOGIN：' . $aresp;
        }
    }
    if ($fail === '') {
        [$ok, $ac, $aresp] = $talk(base64_encode($user), [334]);
        if (!$ok) {
            $fail = '账号被拒绝：' . $aresp;
        }
    }
    if ($fail === '') {
        [$ok, $ac, $aresp] = $talk(base64_encode($pass), [235]);
        if (!$ok) {
            $fail = '登录失败（请确认使用邮箱授权码）：' . $aresp;
        }
    }
    if ($fail === '') {
        [$ok, $mc, $mresp] = $talk('MAIL FROM:<' . $from . '>', [250]);
        if (!$ok) {
            $fail = 'MAIL FROM 被拒绝：' . $mresp;
        }
    }
    if ($fail === '') {
        [$ok, $rc, $rresp] = $talk('RCPT TO:<' . $to . '>', [250, 251]);
        if (!$ok) {
            $fail = '收件地址被拒绝：' . $rresp;
        }
    }
    if ($fail === '') {
        [$ok, $dc, $dresp] = $talk('DATA', [354]);
        if (!$ok) {
            $fail = 'DATA 被拒绝：' . $dresp;
        }
    }
    if ($fail === '') {
        $namePart = $fromName === '' ? '' : '=?UTF-8?B?' . base64_encode($fromName) . '?= ';
        $headers = [
            'Date: ' . date('r'),
            'From: ' . $namePart . '<' . $from . '>',
            'To: <' . $to . '>',
            'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
            'Message-ID: <' . bin2hex(random_bytes(8)) . '@' . $host . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        $payload = implode($crlf, $headers) . $crlf . $crlf . chunk_split(base64_encode($html), 76, $crlf);
        $payload = (string) preg_replace('/^[.]/m', '..', $payload);
        if (@fwrite($fp, $payload . $crlf . '.' . $crlf) === false) {
            $fail = '正文写入失败';
        } else {
            [$dcode, $dbody] = $readResp();
            if ($dcode !== 250) {
                $fail = '邮件被退回：' . $dbody;
            }
        }
    }
    @$talk('QUIT', [221]);
    @fclose($fp);
    if ($fail !== '') {
        return ['ok' => false, 'error' => $fail];
    }
    return ['ok' => true, 'error' => ''];
}

/**
 * 验证码邮件 HTML 模板（卡片式，兼容 QQ 邮箱 / Gmail / Outlook 等主流客户端）
 * 使用 table 布局与内联样式，避免现代 CSS 在邮件客户端失效。
 */
function pl_mail_tpl_code(string $sitename, string $code, string $homeUrl = ''): string
{
    $site = htmlspecialchars($sitename !== '' ? $sitename : 'PuddingLogin', ENT_QUOTES, 'UTF-8');
    $codeHtml = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    $url = $homeUrl !== '' ? htmlspecialchars($homeUrl, ENT_QUOTES, 'UTF-8') : '';
    $tpl = <<<'HTML'
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:0;padding:32px 12px;background:#eef1f7;'>
<tr><td align='center'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='max-width:560px;background:#ffffff;border-radius:18px;box-shadow:0 12px 32px rgba(15,23,42,0.08);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif;'>
<tr><td style='padding:26px 32px;background:#ff8a5b;background-image:linear-gradient(135deg,#ffb86b 0%,#ff6b9d 52%,#a78bfa 100%);border-radius:18px 18px 0 0;'>
<div style='font-size:17px;font-weight:700;color:#ffffff;letter-spacing:0.5px;'>{{SITE}}</div>
<div style='margin-top:4px;font-size:11px;color:#ffffff;opacity:0.85;letter-spacing:2px;text-transform:uppercase;'>Account Security</div>
</td></tr>
<tr><td style='padding:32px 32px 0;'>
<div style='font-size:19px;font-weight:700;color:#111827;'>邮箱验证码</div>
<p style='margin:14px 0 0;font-size:14px;line-height:1.8;color:#4b5563;'>您好，您正在使用 <strong style='color:#111827;'>{{SITE}}</strong> 的邮箱验证服务。请在页面中输入下方验证码完成验证：</p>
</td></tr>
<tr><td style='padding:22px 32px 6px;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f6f7fb;border:1px dashed #d8dce8;border-radius:14px;'>
<tr><td align='center' style='padding:24px 16px;'>
<div style='font-size:12px;color:#8a90a6;letter-spacing:1px;'>验 证 码</div>
<div style='margin-top:10px;font-size:34px;font-weight:700;letter-spacing:10px;color:#ff6b9d;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'>{{CODE}}</div>
<div style='margin-top:10px;font-size:12px;color:#9aa0b4;'>60 分钟内有效，仅可使用一次</div>
</td></tr>
</table>
</td></tr>
<tr><td style='padding:18px 32px 0;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#fff7ed;border-left:3px solid #f59e0b;border-radius:8px;'>
<tr><td style='padding:12px 14px;font-size:12.5px;line-height:1.7;color:#92400e;'>安全提示：该验证码仅用于本次验证，请勿向任何人泄露。{{SITE}} 工作人员绝不会以任何方式向您索取验证码。</td></tr>
</table>
</td></tr>
<tr><td style='padding:20px 32px 0;font-size:12.5px;line-height:1.8;color:#6b7280;'>如果这不是您本人的操作，请忽略本邮件，您的账号仍然安全。如需帮助，可访问 <a href='{{URL}}' style='color:#ff6b9d;text-decoration:none;'>{{URL}}</a>。</td></tr>
<tr><td style='padding:26px 32px 30px;'>
<div style='height:1px;background:#eceef5;font-size:0;line-height:0;'>&nbsp;</div>
<p style='margin:16px 0 0;font-size:11.5px;line-height:1.8;color:#a2a7b8;'>此邮件由 {{SITE}} 系统自动发送，请勿直接回复。<br />© {{YEAR}} {{SITE}} · All rights reserved.</p>
</td></tr>
</table>
<div style='margin-top:14px;font-size:11px;color:#9aa0b4;'>为保障账号安全，请勿转发此邮件</div>
</td></tr>
</table>
HTML;
    return str_replace(
        ['{{SITE}}', '{{CODE}}', '{{URL}}', '{{YEAR}}'],
        [$site, $codeHtml, $url, date('Y')],
        $tpl
    );
}

function pl_platform_mode(string $type): string
{
    $row = pl_platform_row($type);
    return $row === null ? 'official' : (string) $row['mode'];
}

function pl_platform_switch_on(string $type): bool
{
    $row = pl_platform_row($type);
    return $row !== null && (int) $row['status'] === 1;
}
