<?php
declare(strict_types=1);

final class AdminApi
{
    private const CONFIG_KEYS = [
        'sitename' => 'text',
        'title' => 'text',
        'keywords' => 'text',
        'description' => 'text',
        'siteurl' => 'text',
        'kfqq' => 'text',
        'reg_open' => 'bool',
        'reg_channel' => 'text',
        'captcha_open_login' => 'bool',
        'test_open' => 'bool',
        'oauth_qq_appid' => 'text',
        'oauth_qq_appkey' => 'secret',
        'oauth_wx_appid' => 'text',
        'oauth_wx_appkey' => 'secret',
        'oauth_alipay_appid' => 'text',
        'oauth_alipay_appkey' => 'secret',
        'oauth_baidu_appid' => 'text',
        'oauth_baidu_appkey' => 'secret',
        'oauth_sina_appid' => 'text',
        'oauth_sina_appkey' => 'secret',
        'oauth_dingtalk_appid' => 'text',
        'oauth_dingtalk_appkey' => 'secret',
        'oauth_xiaomi_appid' => 'text',
        'oauth_xiaomi_appkey' => 'secret',
        'oauth_huawei_appid' => 'text',
        'oauth_huawei_appkey' => 'secret',
        'oauth_github_appid' => 'text',
        'oauth_github_appkey' => 'secret',
        'oauth_gitee_appid' => 'text',
        'oauth_gitee_appkey' => 'secret',
        'oauth_google_appid' => 'text',
        'oauth_google_appkey' => 'secret',
        'oauth_facebook_appid' => 'text',
        'oauth_facebook_appkey' => 'secret',
        'oauth_twitter_appid' => 'text',
        'oauth_twitter_appkey' => 'secret',
        'oauth_microsoft_appid' => 'text',
        'oauth_microsoft_appkey' => 'secret',
        'oauth_puddingchat_appid' => 'text',
        'oauth_puddingchat_appkey' => 'secret',
        'oauth_puddingchat_authorize' => 'text',
        'oauth_puddingchat_token' => 'text',
        'oauth_puddingchat_userinfo' => 'text',
        'captcha_enable' => 'bool',
        'captcha_api_url' => 'text',
        'captcha_access_key' => 'text',
        'captcha_secret' => 'secret',
        'captcha_type' => 'text',
        'captcha_mode' => 'text',
    ];

    public static function dispatch(string $act): void
    {
        $demoReadonly = [
            "admin.config.save", "admin.user.save", "admin.user.pwd", "admin.self.pwd",
            "admin.app.toggle", "admin.app.delete", "admin.group.save", "admin.group.delete",
            "admin.group.buy", "admin.order.close", "admin.account.delete",
        ];
        if (in_array($act, $demoReadonly, true)) {
            pl_demo_guard("管理后台");
        }
        switch ($act) {
            case 'admin.config':
                self::configGet();
                break;
            case 'admin.config.save':
                self::configSave();
                break;
            case 'admin.stats':
                self::stats();
                break;
            case 'admin.users':
                self::users();
                break;
            case 'admin.user.save':
                self::userSave();
                break;
            case 'admin.user.pwd':
                self::userPwd();
                break;
            case 'admin.self.pwd':
                self::selfPwd();
                break;
            case 'admin.apps':
                self::apps();
                break;
            case 'admin.app.toggle':
                self::appToggle();
                break;
            case 'admin.app.delete':
                self::appDelete();
                break;
            case 'admin.logs':
                self::logs();
                break;
            case 'admin.userlogs':
                self::userLogs();
                break;
            case 'admin.groups':
                self::groups();
                break;
            case 'admin.group.save':
                self::groupSave();
                break;
            case 'admin.group.delete':
                self::groupDelete();
                break;
            case 'admin.group.buy':
                self::groupBuy();
                break;
            case 'admin.orders':
                self::orders();
                break;
            case 'admin.order.close':
                self::orderClose();
                break;
            case 'admin.accounts':
                self::accounts();
                break;
            case 'admin.account.delete':
                self::accountDelete();
                break;
            case 'admin.loginlogs':
                self::loginLogs();
                break;
            default:
                pl_err('未知的管理接口', -4, 404);
        }
    }

    private static function method(string $expect): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $expect) {
            pl_err('请求方式错误', -4, 405);
        }
    }

    private static function configGet(): void
    {
        pl_require_admin();
        $out = [];
        foreach (self::CONFIG_KEYS as $key => $kind) {
            $raw = (string) pl_conf($key, '');
            if ($kind === 'bool') {
                $out[$key] = (int) $raw === 1;
            } elseif ($kind === 'secret') {
                $out[$key] = $raw === '' ? '' : pl_mask_key($raw);
                $out[$key . '_set'] = $raw !== '';
            } else {
                $out[$key] = $raw;
            }
        }
        pl_ok(['config' => $out]);
    }

    private static function configSave(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $changed = [];
        $demoRaw = pl_in("test_open", "__PL_UNSET__");
        if ($demoRaw !== "__PL_UNSET__") {
            $demoHash = pl_demo_password_hash();
            if ($demoRaw === "1" || $demoRaw === "true") {
                if ($demoHash === "") {
                    pl_err("开启演示模式前请先在系统设置中设置演示密码");
                }
            } elseif (pl_demo_on() && $demoHash !== "") {
                if (!password_verify(pl_in("demo_password"), $demoHash)) {
                    pl_err("演示密码不正确，无法关闭演示模式");
                }
            }
        }
        foreach (self::CONFIG_KEYS as $key => $kind) {
            $raw = pl_in($key, '__PL_UNSET__');
            if ($raw === '__PL_UNSET__') {
                continue;
            }
            if ($kind === 'bool') {
                $val = ($raw === '1' || $raw === 'true') ? '1' : '0';
            } elseif ($kind === 'secret') {
                if ($raw === '' || strpos($raw, '*') !== false) {
                    continue;
                }
                $val = $raw;
            } else {
                $val = mb_substr($raw, 0, $key === 'description' ? 500 : 255);
            }
            $old = (string) pl_conf($key, '');
            if ($old !== $val) {
                pl_conf_set($key, $val);
                $changed[] = $key;
            }
        }
        if (!empty($changed)) {
            pl_admin_log((int) $admin['uid'], 'config.save', '修改配置：' . implode(',', $changed));
        }
        pl_ok(['changed' => $changed], empty($changed) ? '没有需要保存的变更' : '配置已保存并立即生效');
    }

    private static function stats(): void
    {
        pl_require_admin();
        $pdo = pl_pdo();
        $today = $pdo->quote(date('Y-m-d'));
        $stats = [
            'users' => (int) $pdo->query('SELECT COUNT(*) FROM pl_user')->fetchColumn(),
            'users_today' => (int) $pdo->query('SELECT COUNT(*) FROM pl_user WHERE DATE(addtime) = ' . $today)->fetchColumn(),
            'admins' => (int) $pdo->query('SELECT COUNT(*) FROM pl_user WHERE is_admin = 1')->fetchColumn(),
            'disabled' => (int) $pdo->query('SELECT COUNT(*) FROM pl_user WHERE status = 0')->fetchColumn(),
            'apps' => (int) $pdo->query('SELECT COUNT(*) FROM pl_apps')->fetchColumn(),
            'accounts' => (int) $pdo->query('SELECT COUNT(*) FROM pl_accounts')->fetchColumn(),
            'logs' => (int) $pdo->query('SELECT COUNT(*) FROM pl_userlog')->fetchColumn(),
            'logs_today' => (int) $pdo->query('SELECT COUNT(*) FROM pl_userlog WHERE DATE(date) = ' . $today)->fetchColumn(),
        ];
        pl_ok(['stats' => $stats]);
    }

    private static function users(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $kw = trim(pl_in('kw'));
        $where = '';
        $args = [];
        if ($kw !== '') {
            $where = ' WHERE username LIKE ? OR nickname LIKE ? OR email LIKE ? OR phone LIKE ?';
            $like = '%' . $kw . '%';
            $args = [$like, $like, $like, $like];
        }
        $pdo = pl_pdo();
        $c = $pdo->prepare('SELECT COUNT(*) FROM pl_user' . $where);
        $c->execute($args);
        $total = (int) $c->fetchColumn();
        $stmt = $pdo->prepare('SELECT uid, username, nickname, email, phone, avatar, money, gid, status, is_admin, addtime, lasttime, lastip, qq_uid, wx_uid, alipay_uid FROM pl_user' . $where . ' ORDER BY uid DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $u) {
            $items[] = [
                'uid' => (int) $u['uid'],
                'username' => $u['username'],
                'nickname' => $u['nickname'] ?: $u['username'],
                'email' => (string) $u['email'],
                'phone' => (string) $u['phone'],
                'avatar' => (string) $u['avatar'],
                'status' => (int) $u['status'],
                'is_admin' => (int) $u['is_admin'],
                'addtime' => $u['addtime'],
                'lasttime' => $u['lasttime'],
                'lastip' => (string) $u['lastip'],
                'bound' => [
                    'qq' => (string) $u['qq_uid'] !== '',
                    'wx' => (string) $u['wx_uid'] !== '',
                    'alipay' => (string) $u['alipay_uid'] !== '',
                ],
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function userSave(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $uid = (int) pl_in('uid');
        if ($uid <= 0) {
            pl_err('参数错误');
        }
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_user WHERE uid = ? LIMIT 1');
        $stmt->execute([$uid]);
        $target = $stmt->fetch();
        if (!$target) {
            pl_err('用户不存在');
        }
        $set = [];
        $args = [];
        $notes = [];
        if (pl_in('status', '__UNSET__') !== '__UNSET__') {
            $status = (int) pl_in('status') === 1 ? 1 : 0;
            if ($status === 0 && $uid === (int) $admin['uid']) {
                pl_err('不能封禁自己的账号');
            }
            $set[] = 'status = ?';
            $args[] = $status;
            $notes[] = $status === 1 ? '启用账号' : '封禁账号';
        }
        if (pl_in('is_admin', '__UNSET__') !== '__UNSET__') {
            $flag = (int) pl_in('is_admin') === 1 ? 1 : 0;
            if ($flag === 0 && $uid === (int) $admin['uid']) {
                pl_err('不能取消自己的管理员权限');
            }
            $set[] = 'is_admin = ?';
            $args[] = $flag;
            $notes[] = $flag === 1 ? '设为管理员' : '取消管理员';
        }
        if (pl_in('nickname', '__UNSET__') !== '__UNSET__') {
            $v = trim((string) pl_in('nickname', ''));
            if ($v !== '' && mb_strlen($v) > 64) {
                pl_err('昵称不能超过64个字符');
            }
            $set[] = 'nickname = ?';
            $args[] = $v;
            $notes[] = '修改昵称';
        }
        if (pl_in('email', '__UNSET__') !== '__UNSET__') {
            $v = trim((string) pl_in('email', ''));
            if ($v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) {
                pl_err('邮箱格式不正确');
            }
            $set[] = 'email = ?';
            $args[] = $v;
            $notes[] = '修改邮箱';
        }
        if (pl_in('phone', '__UNSET__') !== '__UNSET__') {
            $v = trim((string) pl_in('phone', ''));
            if ($v !== '' && !preg_match('/^1\d{10}$/', $v)) {
                pl_err('手机号格式不正确');
            }
            $set[] = 'phone = ?';
            $args[] = $v;
            $notes[] = '修改手机号';
        }
        if (pl_in('gid', '__UNSET__') !== '__UNSET__') {
            $g = (int) pl_in('gid');
            $set[] = 'gid = ?';
            $args[] = $g;
            $notes[] = '修改用户组';
        }
        if (pl_in('money', '__UNSET__') !== '__UNSET__') {
            $m = round((float) pl_in('money'), 2);
            $set[] = 'money = ?';
            $args[] = max(0, $m);
            $notes[] = '修改余额';
        }
        if (empty($set)) {
            pl_err('没有需要修改的内容');
        }
        $args[] = $uid;
        pl_pdo()->prepare('UPDATE pl_user SET ' . implode(', ', $set) . ' WHERE uid = ?')->execute($args);
        $detail = implode('，', $notes);
        pl_admin_log((int) $admin['uid'], 'user.save', $detail, (string) $target['username']);
        pl_ok([], $detail . ' 成功');
    }

    private static function userPwd(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $uid = (int) pl_in('uid');
        $pwd = pl_in('password');
        $stmt = pl_pdo()->prepare('SELECT username FROM pl_user WHERE uid = ? LIMIT 1');
        $stmt->execute([$uid]);
        $target = $stmt->fetch();
        if (!$target) {
            pl_err('用户不存在');
        }
        if (!pl_valid_pwd($pwd, (string) $target['username'])) {
            pl_err('新密码需 6-64 位，不能是纯数字，也不能与用户名相同');
        }
        pl_pdo()->prepare('UPDATE pl_user SET pwd = ? WHERE uid = ?')->execute([pl_hash_pwd($pwd), $uid]);
        pl_admin_log((int) $admin['uid'], 'user.pwd', '重置密码', (string) $target['username']);
        pl_ok([], '密码已重置，请通知用户使用新密码登录');
    }

    private static function selfPwd(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $oldPwd = pl_in('old_password');
        $newPwd = pl_in('new_password');
        $newPwd2 = pl_in('new_password2');
        if ($oldPwd === '' || $newPwd === '' || $newPwd2 === '') {
            pl_err('请填写完整信息');
        }
        if ($newPwd !== $newPwd2) {
            pl_err('两次输入的新密码不一致');
        }
        $stmt = pl_pdo()->prepare('SELECT pwd, username FROM pl_user WHERE uid = ? LIMIT 1');
        $stmt->execute([(int) $admin['uid']]);
        $self = $stmt->fetch();
        if (!$self) {
            pl_err('用户不存在');
        }
        if (!pl_verify_pwd($oldPwd, (string) $self['pwd'])) {
            pl_err('旧密码不正确');
        }
        if (!pl_valid_pwd($newPwd, (string) $self['username'])) {
            pl_err('新密码需 6-64 位，不能是纯数字，也不能与用户名相同');
        }
        pl_pdo()->prepare('UPDATE pl_user SET pwd = ? WHERE uid = ?')->execute([pl_hash_pwd($newPwd), (int) $admin['uid']]);
        pl_admin_log((int) $admin['uid'], 'self.pwd', '修改密码', (string) $self['username']);
        pl_ok([], '密码修改成功，下次登录请使用新密码');
    }

    private static function apps(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $kw = trim(pl_in('kw'));
        $where = '';
        $args = [];
        if ($kw !== '') {
            $where = ' WHERE a.name LIKE ? OR a.appid LIKE ?';
            $like = '%' . $kw . '%';
            $args = [$like, $like];
        }
        $pdo = pl_pdo();
        $c = $pdo->prepare('SELECT COUNT(*) FROM pl_apps a' . $where);
        $c->execute($args);
        $total = (int) $c->fetchColumn();
        $sql = 'SELECT a.*, u.username FROM pl_apps a LEFT JOIN pl_user u ON u.uid = a.uid' . $where . ' ORDER BY a.id DESC LIMIT ' . $offset . ', ' . $size;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $a) {
            $d = $pdo->prepare('SELECT domain FROM pl_appdomain WHERE appid = ? ORDER BY id ASC');
            $d->execute([$a['appid']]);
            $items[] = [
                'id' => (int) $a['id'],
                'appid' => $a['appid'],
                'appkey' => pl_mask_key((string) $a['appkey']),
                'name' => $a['name'],
                'type' => $a['type'],
                'status' => (int) $a['status'],
                'owner' => (string) ($a['username'] ?? '-'),
                'uid' => (int) $a['uid'],
                'addtime' => $a['addtime'],
                'domains' => array_map(static fn ($r) => $r['domain'], $d->fetchAll()),
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function appToggle(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_apps WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $app = $stmt->fetch();
        if (!$app) {
            pl_err('应用不存在');
        }
        $status = (int) $app['status'] === 1 ? 0 : 1;
        pl_pdo()->prepare('UPDATE pl_apps SET status = ? WHERE id = ?')->execute([$status, $id]);
        pl_admin_log((int) $admin['uid'], 'app.toggle', $status === 1 ? '启用应用' : '停用应用', (string) $app['appid']);
        pl_ok(['status' => $status], $status === 1 ? '应用已启用' : '应用已停用');
    }

    private static function appDelete(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $stmt = pl_pdo()->prepare('SELECT appid, name FROM pl_apps WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $app = $stmt->fetch();
        if (!$app) {
            pl_err('应用不存在');
        }
        pl_pdo()->prepare('DELETE FROM pl_apps WHERE id = ?')->execute([$id]);
        pl_pdo()->prepare('DELETE FROM pl_appdomain WHERE appid = ?')->execute([$app['appid']]);
        pl_admin_log((int) $admin['uid'], 'app.delete', '删除应用：' . $app['name'], (string) $app['appid']);
        pl_ok([], '应用已删除');
    }

    private static function logs(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $pdo = pl_pdo();
        $total = (int) $pdo->query('SELECT COUNT(*) FROM pl_adminlog')->fetchColumn();
        $stmt = $pdo->prepare('SELECT l.*, u.username FROM pl_adminlog l LEFT JOIN pl_user u ON u.uid = l.uid ORDER BY l.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute();
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'id' => (int) $r['id'],
                'uid' => (int) $r['uid'],
                'username' => (string) ($r['username'] ?? '-'),
                'action' => $r['action'],
                'detail' => $r['detail'],
                'target' => $r['target'],
                'date' => $r['date'],
                'ip' => $r['ip'],
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function userLogs(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $pdo = pl_pdo();
        $total = (int) $pdo->query('SELECT COUNT(*) FROM pl_userlog')->fetchColumn();
        $stmt = $pdo->prepare('SELECT l.type, l.date, l.ip, u.username FROM pl_userlog l LEFT JOIN pl_user u ON u.uid = l.uid ORDER BY l.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute();
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'username' => (string) ($r['username'] ?? '-'),
                'type' => $r['type'],
                'date' => $r['date'],
                'ip' => $r['ip'],
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function groups(): void
    {
        pl_require_admin();
        $pdo = pl_pdo();
        $rows = $pdo->query('SELECT gid, name, ucount, info, price, expire_months, sort, buyable, logins FROM pl_group ORDER BY sort ASC, gid ASC')->fetchAll();
        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'gid' => (int) $r['gid'],
                'name' => $r['name'],
                'ucount' => (int) $r['ucount'],
                'info' => $r['info'] ?: '{}',
                'price' => (float) $r['price'],
                'expire_months' => (int) $r['expire_months'],
                'sort' => (int) $r['sort'],
                'buyable' => (int) $r['buyable'] === 1,
                'logins' => (string) $r['logins'],
            ];
        }
        pl_ok(['items' => $items, 'open' => (int) pl_conf('group_buy_open', '0') === 1]);
    }

    private static function groupSave(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $gid = (int) pl_in('gid', '0');
        $name = trim((string) pl_in('name', ''));
        if ($name === '' || mb_strlen($name) > 32) {
            pl_err('用户组名称需 1-32 个字符');
        }
        $ucount = max(0, (int) pl_in('ucount', '0'));
        $info = trim((string) pl_in('info', '{}'));
        $price = max(0, (float) pl_in('price', '0'));
        $expire = max(0, (int) pl_in('expire_months', '0'));
        $sort = (int) pl_in('sort', '0');
        $buyable = (int) pl_in('buyable', '0') === 1 ? 1 : 0;
        $logins = trim((string) pl_in('logins', ''));
        $pdo = pl_pdo();
        if ($gid > 0) {
            $stmt = $pdo->prepare('SELECT gid FROM pl_group WHERE gid = ? LIMIT 1');
            $stmt->execute([$gid]);
            if (!$stmt->fetch()) {
                pl_err('用户组不存在');
            }
            $pdo->prepare('UPDATE pl_group SET name = ?, ucount = ?, info = ?, price = ?, expire_months = ?, sort = ?, buyable = ?, logins = ? WHERE gid = ?')
                ->execute([$name, $ucount, $info, $price, $expire, $sort, $buyable, $logins, $gid]);
            pl_admin_log((int) $admin['uid'], 'group.save', '编辑用户组', $name);
            pl_ok(['gid' => $gid], '用户组已更新');
        } else {
            $pdo->prepare('INSERT INTO pl_group (name, ucount, info, price, expire_months, sort, buyable, logins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$name, $ucount, $info, $price, $expire, $sort, $buyable, $logins]);
            $newGid = (int) $pdo->lastInsertId();
            pl_admin_log((int) $admin['uid'], 'group.save', '新增用户组', $name);
            pl_ok(['gid' => $newGid], '用户组已创建');
        }
    }

    private static function groupDelete(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $gid = (int) pl_in('gid');
        if ($gid <= 0) {
            pl_err('参数错误');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT name FROM pl_group WHERE gid = ? LIMIT 1');
        $stmt->execute([$gid]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('用户组不存在');
        }
        $pdo->prepare('DELETE FROM pl_group WHERE gid = ?')->execute([$gid]);
        pl_admin_log((int) $admin['uid'], 'group.delete', '删除用户组', $row['name']);
        pl_ok([], '用户组已删除');
    }

    private static function groupBuy(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $open = (int) pl_in('open', '0') === 1 ? '1' : '0';
        pl_conf_set('group_buy_open', $open);
        $items = json_decode((string) pl_in('items', '[]'), true);
        if (is_array($items)) {
            $pdo = pl_pdo();
            $stmt = $pdo->prepare('UPDATE pl_group SET price = ?, expire_months = ?, sort = ?, buyable = ? WHERE gid = ?');
            foreach ($items as $it) {
                if (!is_array($it)) {
                    continue;
                }
                $gid = (int) ($it['gid'] ?? 0);
                if ($gid <= 0) {
                    continue;
                }
                $stmt->execute([
                    max(0, (float) ($it['price'] ?? 0)),
                    max(0, (int) ($it['expire_months'] ?? 0)),
                    (int) ($it['sort'] ?? 0),
                    !empty($it['buyable']) ? 1 : 0,
                    $gid,
                ]);
            }
        }
        pl_admin_log((int) $admin['uid'], 'group.buy', '保存用户组购买设置', 'open=' . $open);
        pl_ok(['open' => $open === '1']);
    }

    private static function orders(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $kw = trim((string) pl_in('kw', ''));
        $status = trim((string) pl_in('status', ''));
        $uid = (int) pl_in('uid', '0');
        $where = [];
        $args = [];
        if ($kw !== '') {
            $where[] = '(o.orderno LIKE ? OR o.title LIKE ?)';
            $args[] = '%' . $kw . '%';
            $args[] = '%' . $kw . '%';
        }
        if ($status !== '' && $status !== 'all') {
            $where[] = 'o.status = ?';
            $args[] = (int) $status;
        }
        if ($uid > 0) {
            $where[] = 'o.uid = ?';
            $args[] = $uid;
        }
        $sqlWhere = $where ? (' WHERE ' . implode(' AND ', $where)) : '';
        $pdo = pl_pdo();
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM pl_order o' . $sqlWhere);
        $cnt->execute($args);
        $total = (int) $cnt->fetchColumn();
        $stmt = $pdo->prepare('SELECT o.*, u.username FROM pl_order o LEFT JOIN pl_user u ON u.uid = o.uid' . $sqlWhere . ' ORDER BY o.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'id' => (int) $r['id'],
                'orderno' => (string) $r['orderno'],
                'uid' => (int) $r['uid'],
                'username' => (string) ($r['username'] ?? '-'),
                'gid' => (int) $r['gid'],
                'title' => (string) $r['title'],
                'amount' => (float) $r['amount'],
                'paytype' => (string) $r['paytype'],
                'status' => (int) $r['status'],
                'addtime' => (string) ($r['addtime'] ?? ''),
                'paytime' => (string) ($r['paytime'] ?? ''),
                'ip' => (string) ($r['ip'] ?? ''),
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function orderClose(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $id = (int) pl_in('id', '0');
        if ($id <= 0) {
            pl_err('参数错误');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT orderno, status FROM pl_order WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('订单不存在');
        }
        if ((int) $row['status'] === 1) {
            pl_err('已支付订单不可关闭');
        }
        $pdo->prepare('UPDATE pl_order SET status = 2 WHERE id = ?')->execute([$id]);
        pl_admin_log((int) $admin['uid'], 'order.close', '关闭订单', (string) $row['orderno']);
        pl_ok([], '订单已关闭');
    }

    private static function accounts(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $kw = trim((string) pl_in('kw', ''));
        $type = trim((string) pl_in('type', ''));
        $appid = trim((string) pl_in('appid', ''));
        $uid = (int) pl_in('uid', '0');
        $where = [];
        $args = [];
        if ($kw !== '') {
            $where[] = '(a.social_uid LIKE ? OR a.nickname LIKE ?)';
            $args[] = '%' . $kw . '%';
            $args[] = '%' . $kw . '%';
        }
        if ($type !== '' && $type !== 'all') {
            $where[] = 'a.type = ?';
            $args[] = $type;
        }
        if ($appid !== '') {
            $where[] = 'a.appid = ?';
            $args[] = $appid;
        }
        if ($uid > 0) {
            $where[] = 'a.uid = ?';
            $args[] = $uid;
        }
        $sqlWhere = $where ? (' WHERE ' . implode(' AND ', $where)) : '';
        $pdo = pl_pdo();
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM pl_accounts a' . $sqlWhere);
        $cnt->execute($args);
        $total = (int) $cnt->fetchColumn();
        $stmt = $pdo->prepare('SELECT a.*, u.username FROM pl_accounts a LEFT JOIN pl_user u ON u.uid = a.uid' . $sqlWhere . ' ORDER BY a.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'id' => (int) $r['id'],
                'uid' => (int) $r['uid'],
                'username' => (string) ($r['username'] ?? '-'),
                'appid' => (string) $r['appid'],
                'type' => (string) $r['type'],
                'social_uid' => (string) $r['social_uid'],
                'nickname' => (string) ($r['nickname'] ?? ''),
                'faceimg' => (string) ($r['faceimg'] ?? ''),
                'gender' => (int) $r['gender'],
                'addtime' => (string) ($r['addtime'] ?? ''),
                'lasttime' => (string) ($r['lasttime'] ?? ''),
                'lastip' => (string) ($r['lastip'] ?? ''),
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function accountDelete(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $id = (int) pl_in('id', '0');
        if ($id <= 0) {
            pl_err('参数错误');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT uid, type, social_uid FROM pl_accounts WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('账号不存在');
        }
        $pdo->prepare('DELETE FROM pl_accounts WHERE id = ?')->execute([$id]);
        pl_admin_log((int) $admin['uid'], 'account.delete', '删除第三方账号绑定', $row['type'] . ':' . $row['social_uid']);
        pl_ok([], '账号已删除');
    }

    private static function loginLogs(): void
    {
        pl_require_admin();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 20;
        $offset = ($page - 1) * $size;
        $kw = trim((string) pl_in('kw', ''));
        $type = trim((string) pl_in('type', ''));
        $where = [];
        $args = [];
        if ($kw !== '') {
            $where[] = '(l.social_uid LIKE ? OR l.domain LIKE ? OR l.ip LIKE ?)';
            $args[] = '%' . $kw . '%';
            $args[] = '%' . $kw . '%';
            $args[] = '%' . $kw . '%';
        }
        if ($type !== '' && $type !== 'all') {
            $where[] = 'l.way = ?';
            $args[] = $type;
        }
        $sqlWhere = $where ? (' WHERE ' . implode(' AND ', $where)) : '';
        $pdo = pl_pdo();
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM pl_userlog l' . $sqlWhere);
        $cnt->execute($args);
        $total = (int) $cnt->fetchColumn();
        $stmt = $pdo->prepare('SELECT l.*, u.username FROM pl_userlog l LEFT JOIN pl_user u ON u.uid = l.uid' . $sqlWhere . ' ORDER BY l.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'id' => (int) $r['id'],
                'uid' => (int) $r['uid'],
                'username' => (string) ($r['username'] ?? '-'),
                'appid' => (string) $r['appid'],
                'type' => (string) $r['type'],
                'way' => (string) $r['way'],
                'social_uid' => (string) $r['social_uid'],
                'domain' => (string) $r['domain'],
                'ip' => (string) ($r['ip'] ?? ''),
                'date' => (string) ($r['date'] ?? ''),
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }
}
