<?php
declare(strict_types=1);

final class Api
{
    public static function dispatch(string $act): void
    {
        switch ($act) {
            case 'site':
                pl_ok(['site' => pl_site_public(), 'csrf_token' => pl_csrf()]);
                break;
            case 'csrf':
                pl_ok(['csrf_token' => pl_csrf()]);
                break;
            case 'me':
                self::me();
                break;
            case 'login':
                self::login();
                break;
            case 'logout':
                self::logout();
                break;
            case 'reg':
                self::register();
                break;
            case 'sendcode':
                self::sendcode();
                break;
            case 'captcha.get':
                self::captchaGet();
                break;
            case 'captcha.check':
                self::captchaCheck();
                break;
            case 'findpwd':
                self::findpwd();
                break;
            case 'connect':
                self::connect();
                break;
            case 'callback':
                self::callback();
                break;
            case 'overview':
                self::overview();
                break;
            case 'profile':
                self::profile();
                break;
            case 'password':
                self::password();
                break;
            case 'apps':
                self::apps();
                break;
            case 'app.create':
                self::appCreate();
                break;
            case 'app.update':
                self::appUpdate();
                break;
            case 'app.delete':
                self::appDelete();
                break;
            case 'app.reset':
                self::appReset();
                break;
            case 'accounts':
                self::accounts();
                break;
            case 'account.delete':
                self::accountDelete();
                break;
            case 'logs':
                self::logs();
                break;
            default:
                if (strncmp($act, 'admin.ticket.', 13) === 0) {
                    TicketApi::adminDispatch($act);
                    break;
                }
                if (strncmp($act, 'ticket.', 7) === 0) {
                    TicketApi::dispatch($act);
                    break;
                }
                if (strncmp($act, 'admin.', 6) === 0) {
                    AdminApi::dispatch($act);
                    break;
                }
                if (strncmp($act, 'platform.', 9) === 0) {
                    PlatformApi::dispatch($act);
                    break;
                }
                if (strncmp($act, 'system.', 7) === 0) {
                    SystemApi::dispatch($act);
                    break;
                }
                pl_err('接口不存在', -4, 404);
        }
    }

    private static function method(string $expect): void
    {
        $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (strtoupper($m) !== $expect) {
            pl_err('请求方法不允许', -1, 405);
        }
    }

    private static function me(): void
    {
        $user = pl_current_user();
        pl_ok([
            'logged' => $user !== null,
            'user' => $user ? pl_user_public($user) : null,
            'csrf_token' => pl_csrf(),
        ]);
    }

    private static function login(): void
    {
        self::method('POST');
        pl_check_csrf();
        $account = pl_in('user');
        $pass = pl_in('pass');
        if ($account === '' || $pass === '') {
            pl_err('请输入账号和密码');
        }
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_user WHERE username = ? OR email = ? OR phone = ? LIMIT 1');
        $stmt->execute([$account, $account, $account]);
        $user = $stmt->fetch();
        if (!$user) {
            pl_err('账号或密码错误');
        }
        if ((int) $user['status'] === 0) {
            pl_err('该账号已被封禁');
        }
        if (!pl_verify_pwd($pass, (string) $user['pwd'])) {
            pl_err('账号或密码错误');
        }
        if (password_needs_rehash((string) $user['pwd'], PASSWORD_DEFAULT)) {
            $up = pl_pdo()->prepare('UPDATE pl_user SET pwd = ? WHERE uid = ?');
            $up->execute([pl_hash_pwd($pass), (int) $user['uid']]);
        }
        $upd = pl_pdo()->prepare('UPDATE pl_user SET lasttime = ?, lastip = ? WHERE uid = ?');
        $upd->execute([pl_now(), pl_client_ip(), (int) $user['uid']]);
        pl_login_user((int) $user['uid']);
        pl_record_log((int) $user['uid'], 'login');
        $fresh = pl_current_user();
        pl_ok(['user' => $fresh ? pl_user_public($fresh) : null, 'csrf_token' => pl_csrf()], '登录成功');
    }

    private static function logout(): void
    {
        self::method('POST');
        $uid = pl_current_uid();
        if ($uid > 0) {
            pl_record_log($uid, 'logout');
        }
        pl_logout_user();
        pl_ok(['csrf_token' => null], '已退出登录');
    }

    private static function register(): void
    {
        self::method('POST');
        pl_check_csrf();
        if ((int) pl_conf('reg_open', '1') !== 1) {
            pl_err('当前未开放注册');
        }
        $username = pl_in('username');
        $pass = pl_in('password');
        $pass2 = pl_in('password2');
        $email = pl_in('email');
        $phone = pl_in('phone');
        $code = pl_in('code');

        if (!pl_valid_username($username)) {
            pl_err('用户名需 3-32 位，且不能包含空格、@ 或其他特殊符号');
        }
        if (!pl_valid_pwd($pass, $username)) {
            pl_err('密码需 6-64 位，不能是纯数字且不能与用户名相同');
        }
        if ($pass !== $pass2) {
            pl_err('两次输入的密码不一致');
        }
        $regChannel = (string) pl_conf('reg_channel', 'both');
        if ($regChannel === 'email' && $email === '') {
            pl_err('当前仅开放邮箱注册');
        }
        if ($regChannel === 'phone' && $phone === '') {
            pl_err('当前仅开放手机号注册');
        }
        if ($email === '' && $phone === '') {
            pl_err('请填写邮箱或手机号');
        }
        if ($email !== '' && !pl_valid_email($email)) {
            pl_err('邮箱格式不正确');
        }
        if ($phone !== '' && !pl_valid_phone($phone)) {
            pl_err('手机号格式不正确');
        }
        $target = $email !== '' ? $email : $phone;
        $channel = $email !== '' ? 'email' : 'phone';
        if (!pl_verify_code('register', $channel, $target, $code)) {
            pl_err('验证码错误或已过期');
        }
        $stmt = pl_pdo()->prepare('SELECT uid FROM pl_user WHERE username = ? OR email = ? OR phone = ? LIMIT 1');
        $stmt->execute([$username, $email, $phone]);
        if ($stmt->fetch()) {
            pl_err('用户名、邮箱或手机号已被占用');
        }
        $ins = pl_pdo()->prepare('INSERT INTO pl_user (username, pwd, email, phone, nickname, addtime, lasttime, lastip, gid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)');
        $ins->execute([
            $username,
            pl_hash_pwd($pass),
            $email !== '' ? $email : null,
            $phone !== '' ? $phone : null,
            $username,
            pl_now(),
            pl_now(),
            pl_client_ip(),
        ]);
        $uid = (int) pl_pdo()->lastInsertId();
        pl_login_user($uid);
        pl_record_log($uid, 'register');
        $user = pl_current_user();
        pl_ok(['user' => $user ? pl_user_public($user) : null, 'csrf_token' => pl_csrf()], '注册成功');
    }

    private static function sendcode(): void
    {
        self::method('POST');
        pl_check_csrf();
        $channel = pl_in('channel', 'email');
        $target = trim(pl_in('target'));
        $purpose = pl_in('purpose', 'register');
        if (!in_array($channel, ['email', 'phone'], true)) {
            pl_err('不支持的验证通道');
        }
        if (!in_array($purpose, ['register', 'reset'], true)) {
            pl_err('不支持的验证码用途');
        }
        if ($channel === 'email' && !pl_valid_email($target)) {
            pl_err('邮箱格式不正确');
        }
        if ($channel === 'phone' && !pl_valid_phone($target)) {
            pl_err('手机号格式不正确');
        }
        if ($purpose === 'register') {
            if ((int) pl_conf('reg_open', '1') !== 1) {
                pl_err('当前未开放注册');
            }
            $regChannel = (string) pl_conf('reg_channel', 'both');
            if ($regChannel === 'email' && $channel !== 'email') {
                pl_err('当前仅开放邮箱注册');
            }
            if ($regChannel === 'phone' && $channel !== 'phone') {
                pl_err('当前仅开放手机号注册');
            }
        } else {
            $field = $channel === 'phone' ? 'phone' : 'email';
            $stmt = pl_pdo()->prepare('SELECT uid FROM pl_user WHERE ' . $field . ' = ? LIMIT 1');
            $stmt->execute([$target]);
            if (!$stmt->fetch()) {
                pl_err($channel === 'phone' ? '该手机号尚未注册' : '该邮箱尚未注册');
            }
        }
        [$ok, $code] = pl_issue_code($purpose, $channel, $target);
        if (!$ok) {
            pl_err((string) $code);
        }
        $sent = self::deliverCode($channel, $target, (string) $code);
        pl_ok([
            'channel' => $channel,
            'target' => $target,
            'sent' => $sent['sent'],
            'debug_code' => $sent['debug'] ? $code : null,
            'message' => $sent['message'],
        ], $sent['message']);
    }
    private static function deliverCode(string $channel, string $target, string $code): array
    {
        $sitename = (string) pl_conf('sitename', 'PuddingLogin');
        $demo = (int) pl_conf('test_open', '0') === 1;
        $reason = '';
        if ($channel === 'email') {
            $enabled = (int) pl_conf('mail_mail_enable', '0') === 1;
            $host = trim((string) pl_conf('mail_mail_host', ''));
            $port = (int) pl_conf('mail_mail_port', '465');
            $user = trim((string) pl_conf('mail_mail_user', ''));
            $pass = trim((string) pl_conf('mail_mail_pass', ''));
            $fromName = trim((string) pl_conf('mail_mail_from', ''));
            if (!$enabled) {
                $reason = '邮件发送未启用，请联系管理员';
            } elseif ($host === '' || $user === '' || $pass === '') {
                $reason = '邮件服务未配置完整（主机 / 账号 / 授权码）';
            } else {
                $body = pl_mail_tpl_code($sitename, $code, pl_self_base());
                $res = pl_mail_send([
                    'host' => $host,
                    'port' => $port > 0 ? $port : 465,
                    'user' => $user,
                    'pass' => $pass,
                    'from' => $user,
                    'from_name' => $fromName !== '' ? $fromName : $sitename,
                    'to' => $target,
                    'subject' => $sitename . ' 验证码',
                    'body' => $body,
                    'timeout' => 15,
                ]);
                if (!empty($res['ok'])) {
                    return ['sent' => true, 'debug' => false, 'message' => '验证码已发送至邮箱，请注意查收'];
                }
                $reason = (string) ($res['error'] ?? '邮件发送失败');
            }
        } else {
            $enabled = (int) pl_conf('mail_sms_enable', '0') === 1;
            $provider = (string) pl_conf('mail_sms_provider', '');
            $smsKey = trim((string) pl_conf('mail_sms_key', ''));
            $secret = trim((string) pl_conf('mail_sms_secret', ''));
            $apiUrl = (string) pl_conf('mail_sms_api_url', 'https://sms.idcbdy.cn/sms');
            $channelId = (string) pl_conf('mail_sms_channel', '');
            $sign = (string) pl_conf('mail_sms_sign', '布丁云');
            if (!$enabled) {
                $reason = '短信发送未启用，请联系管理员';
            } elseif ($provider !== 'puddingv3' || $smsKey === '' || $secret === '' || $apiUrl === '') {
                $reason = '短信服务未配置完整或通道不受支持';
            } else {
                $content = '【' . $sign . '】您的验证码是：' . $code . '，请在60分钟内完成验证，请勿泄露。';
                // 平台要求 p 传 SecretKey 的 MD5 值（32 位，不区分大小写），传明文会返回 30
                $params = ['u' => $smsKey, 'p' => md5($secret), 'm' => $target, 'c' => $content];
                if ($channelId !== '') {
                    $params['g'] = $channelId;
                }
                $ch = curl_init($apiUrl . '?' . http_build_query($params));
                curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 8]);
                $resp = curl_exec($ch);
                $err = curl_error($ch);
                curl_close($ch);
                $respText = is_string($resp) ? trim($resp) : '';
                if ($respText === '') {
                    $reason = '短信服务暂时不可用：' . ($err !== '' ? $err : '无响应');
                } elseif ($respText === '0') {
                    return ['sent' => true, 'debug' => false, 'message' => '验证码已发送至手机'];
                } else {
                    $errMap = ['1' => '发送失败未知原因', '-1' => '参数不全', '30' => '用户密钥错误', '40' => '平台账户不存在', '41' => '账户额度不足', '42' => '内容中缺少短信签名', '43' => '账户已被禁用', '44' => '签名不存在或不属于该账号', '45' => '签名未通过审核', '46' => '账户未通过实名认证', '47' => '指定通道不存在', '48' => '通道状态异常', '50' => '内容含有敏感词', '51' => '手机号码不正确', '60' => '未设置默认通道', '61' => '未购买该通道额度'];
                    $reason = '短信发送失败，' . ($errMap[$respText] ?? ('未知错误：' . $respText));
                }
            }
        }
        if ($demo) {
            return ['sent' => true, 'debug' => true, 'message' => '演示模式：验证码已生成，请查看下方提示'];
        }
        pl_err($reason !== '' ? $reason : '验证码发送失败，请稍后再试');
        return ['sent' => false, 'debug' => false, 'message' => $reason];
    }

    private static function findpwd(): void
    {
        self::method('POST');
        pl_check_csrf();
        $channel = pl_in('channel', 'email');
        $target = pl_in('target');
        $code = pl_in('code');
        $pass = pl_in('password');
        $pass2 = pl_in('password2');
        if (!pl_valid_pwd($pass)) {
            pl_err('密码需 6-64 位且不能是纯数字');
        }
        if ($pass !== $pass2) {
            pl_err('两次输入的密码不一致');
        }
        $field = $channel === 'phone' ? 'phone' : 'email';
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_user WHERE ' . $field . ' = ? LIMIT 1');
        $stmt->execute([$target]);
        $user = $stmt->fetch();
        if (!$user) {
            pl_err('该' . ($channel === 'phone' ? '手机号' : '邮箱') . '未注册');
        }
        if (!pl_verify_code('reset', $channel, $target, $code)) {
            pl_err('验证码错误或已过期');
        }
        $upd = pl_pdo()->prepare('UPDATE pl_user SET pwd = ? WHERE uid = ?');
        $upd->execute([pl_hash_pwd($pass), (int) $user['uid']]);
        pl_record_log((int) $user['uid'], 'resetpwd');
        pl_ok(['username' => $user['username']], '密码已重置，请使用新密码登录');
    }

    private static function connect(): void
    {
        self::method('POST');
        pl_check_csrf();
        $type = pl_in('type');
        $pRow = pl_platform_row($type);
        if ($type === '' || $pRow === null || (int) $pRow['status'] !== 1) {
            pl_err('不支持的登录方式');
        }
        if (!PlOAuth::enabled($type)) {
            pl_err('该登录方式暂未配置，请联系管理员');
        }
        $state = bin2hex(random_bytes(16));
        $redirect = self::baseUrl() . '/api.php?act=callback&type=' . $type;
        $ins = pl_pdo()->prepare('INSERT INTO pl_oauth_state (state, uid, type, redirect, expire) VALUES (?, ?, ?, ?, ?)');
        $bind = (int) pl_in('bind');
        $uid = ($bind === 1) ? pl_current_uid() : 0;
        $ins->execute([$state, $uid, $type, $redirect, time() + 600]);
        $url = PlOAuth::authorizeUrl($type, $redirect, $state);
        pl_ok(['url' => $url, 'state' => $state], '正在跳转授权');
    }

    private static function callback(): void
    {
        $type = pl_in('type');
        $code = pl_in('code');
        $state = pl_in('state');
        if ($type === '' || $code === '' || $state === '') {
            self::callbackFail('授权参数不完整');
        }
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_oauth_state WHERE state = ? AND type = ? AND expire > ? LIMIT 1');
        $stmt->execute([$state, $type, time()]);
        $row = $stmt->fetch();
        if (!$row) {
            self::callbackFail('授权状态已失效，请重新发起登录');
        }
        pl_pdo()->prepare('DELETE FROM pl_oauth_state WHERE id = ?')->execute([(int) $row['id']]);
        $profile = PlOAuth::fetchProfile($type, $code, (string) $row['redirect']);
        if (($profile['code'] ?? -1) !== 0) {
            self::callbackFail((string) ($profile['msg'] ?? '授权失败'));
        }
        $socialUid = (string) $profile['social_uid'];
        $legacyField = in_array($type, ['qq', 'wx', 'alipay'], true) ? $type . '_uid' : '';
        $pdo = pl_pdo();
        $find = $pdo->prepare('SELECT * FROM pl_accounts WHERE type = ? AND social_uid = ? AND uid > 0 LIMIT 1');
        $find->execute([$type, $socialUid]);
        $bound = $find->fetch();
        $uid = $bound ? (int) $bound['uid'] : 0;
        if ($uid === 0 && $legacyField !== '') {
            $find = $pdo->prepare('SELECT * FROM pl_user WHERE ' . $legacyField . ' = ? LIMIT 1');
            $find->execute([$socialUid]);
            $legacy = $find->fetch();
            if ($legacy) {
                $uid = (int) $legacy['uid'];
            }
        }
        $bindUid = (int) $row['uid'];
        if ($bindUid > 0 && $uid === 0) {
            $uid = $bindUid;
        }
        if ($bindUid > 0 && $legacyField !== '') {
            $pdo->prepare('UPDATE pl_user SET ' . $legacyField . ' = ? WHERE uid = ? AND (' . $legacyField . ' IS NULL OR ' . $legacyField . ' = \'\')')
                ->execute([$socialUid, $bindUid]);
        }
        if ($uid === 0) {
            $username = $type . '_' . substr(md5($socialUid . PL_SYS_KEY), 0, 8);
            $ins = $pdo->prepare('INSERT INTO pl_user (username, pwd, nickname, avatar, addtime, lasttime, lastip, gid, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)');
            $ins->execute([
                $username,
                pl_hash_pwd(bin2hex(random_bytes(8))),
                (string) ($profile['nickname'] ?? $username),
                (string) ($profile['faceimg'] ?? ''),
                pl_now(),
                pl_now(),
                pl_client_ip(),
            ]);
            $uid = (int) $pdo->lastInsertId();
            if ($legacyField !== '') {
                $pdo->prepare('UPDATE pl_user SET ' . $legacyField . ' = ? WHERE uid = ?')->execute([$socialUid, $uid]);
            }
        } else {
            $pdo->prepare('UPDATE pl_user SET nickname = COALESCE(NULLIF(nickname, \'\'), ?), avatar = COALESCE(NULLIF(avatar, \'\'), ?), lasttime = ?, lastip = ? WHERE uid = ?')
                ->execute([(string) ($profile['nickname'] ?? ''), (string) ($profile['faceimg'] ?? ''), pl_now(), pl_client_ip(), $uid]);
        }
        $nickname = (string) ($profile['nickname'] ?? '');
        $faceimg = (string) ($profile['faceimg'] ?? '');
        $gender = (int) ($profile['gender'] ?? 0);
        $acc = $pdo->prepare('SELECT id FROM pl_accounts WHERE type = ? AND social_uid = ? LIMIT 1');
        $acc->execute([$type, $socialUid]);
        if (!$acc->fetch()) {
            $pdo->prepare('INSERT INTO pl_accounts (uid, appid, type, social_uid, nickname, faceimg, addtime, gender, lasttime, lastip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$uid, (string) pl_conf('default_appid', ''), $type, $socialUid, $nickname, $faceimg, pl_now(), $gender, pl_now(), pl_client_ip()]);
        } else {
            $pdo->prepare('UPDATE pl_accounts SET uid = ?, nickname = ?, faceimg = ?, gender = ?, lasttime = ?, lastip = ? WHERE type = ? AND social_uid = ?')
                ->execute([$uid, $nickname, $faceimg, $gender, pl_now(), pl_client_ip(), $type, $socialUid]);
        }
        pl_login_user($uid);
        pl_record_log($uid, 'oauth_' . $type, ['social_uid' => $socialUid, 'way' => $type, 'domain' => (string) parse_url(self::baseUrl(), PHP_URL_HOST)]);
        header('Location: ' . self::baseUrl() . '/#/dashboard?welcome=1');
        exit;
    }

    private static function callbackFail(string $msg): void
    {
        header('Location: ' . self::baseUrl() . '/#/login?error=' . rawurlencode($msg));
        exit;
    }

    private static function baseUrl(): string
    {
        // 优先使用后台配置的站点地址，未配置时按当前请求的 Host 推导，避免写死某一域名
        return pl_self_base();
    }

    private static function overview(): void
    {
        $user = pl_require_login();
        $uid = (int) $user['uid'];
        $pdo = pl_pdo();
        $appCount = (int) $pdo->query('SELECT COUNT(*) FROM pl_apps WHERE uid = ' . $uid)->fetchColumn();
        $accCount = (int) $pdo->query('SELECT COUNT(*) FROM pl_accounts WHERE uid = ' . $uid)->fetchColumn();
        $logCount = (int) $pdo->query('SELECT COUNT(*) FROM pl_userlog WHERE uid = ' . $uid)->fetchColumn();
        $stmt = $pdo->prepare('SELECT type, date, ip FROM pl_userlog WHERE uid = ? ORDER BY id DESC LIMIT 5');
        $stmt->execute([$uid]);
        $recent = $stmt->fetchAll();
        $chart = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = date('Y-m-d', strtotime('-' . $i . ' day'));
            $c = $pdo->prepare('SELECT COUNT(*) FROM pl_userlog WHERE uid = ? AND DATE(date) = ?');
            $c->execute([$uid, $day]);
            $chart[] = ['day' => substr($day, 5), 'count' => (int) $c->fetchColumn()];
        }
        pl_ok([
            'user' => pl_user_public($user),
            'stats' => ['apps' => $appCount, 'accounts' => $accCount, 'logs' => $logCount],
            'recent' => array_map(static fn ($r) => ['type' => $r['type'], 'date' => $r['date'], 'ip' => $r['ip']], $recent),
            'chart' => $chart,
        ]);
    }

    private static function profile(): void
    {
        $user = pl_require_login();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            pl_check_csrf();
            $nickname = pl_in('nickname');
            $avatar = pl_in('avatar');
            if (mb_strlen($nickname) > 32) {
                pl_err('昵称过长');
            }
            if ($avatar !== '' && !preg_match('#^https?://#i', $avatar)) {
                pl_err('头像需为 http(s) 链接');
            }
            $upd = pl_pdo()->prepare('UPDATE pl_user SET nickname = ?, avatar = ? WHERE uid = ?');
            $upd->execute([$nickname !== '' ? $nickname : null, $avatar !== '' ? $avatar : null, (int) $user['uid']]);
            pl_record_log((int) $user['uid'], 'update_profile');
            pl_ok(['user' => pl_user_public(pl_current_user())], '资料已更新');
        }
        pl_ok(['user' => pl_user_public($user)]);
    }

    private static function password(): void
    {
        self::method('POST');
        $user = pl_require_login();
        pl_check_csrf();
        $old = pl_in('old_password');
        $new = pl_in('password');
        $new2 = pl_in('password2');
        if (!pl_verify_pwd($old, (string) $user['pwd'])) {
            pl_err('原密码不正确');
        }
        if (!pl_valid_pwd($new)) {
            pl_err('新密码需 6-64 位且不能是纯数字');
        }
        if ($new !== $new2) {
            pl_err('两次输入的新密码不一致');
        }
        $upd = pl_pdo()->prepare('UPDATE pl_user SET pwd = ? WHERE uid = ?');
        $upd->execute([pl_hash_pwd($new), (int) $user['uid']]);
        pl_record_log((int) $user['uid'], 'change_password');
        pl_ok([], '密码修改成功');
    }

    private static function apps(): void
    {
        $user = pl_require_login();
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_apps WHERE uid = ? ORDER BY id DESC');
        $stmt->execute([(int) $user['uid']]);
        $rows = $stmt->fetchAll();
        pl_ok(['items' => array_map([self::class, 'mapApp'], $rows)]);
    }

    public static function mapApp(array $a): array
    {
        $d = pl_pdo()->prepare('SELECT domain FROM pl_appdomain WHERE appid = ? ORDER BY id ASC');
        $d->execute([$a['appid']]);
        $domains = array_map(static fn ($r) => $r['domain'], $d->fetchAll());
        $out = pl_app_public($a);
        $out['domains'] = $domains;
        return $out;
    }

    private static function appCreate(): void
    {
        self::method('POST');
        $user = pl_require_login();
        pl_check_csrf();
        $name = pl_in('name');
        $domains = pl_in('domains');
        $types = self::normalizeAppTypes(pl_in('types'));
        if ($name === '' || mb_strlen($name) > 32) {
            pl_err('请填写应用名称（32 字以内）');
        }
        $type = $types !== '' ? explode(',', $types)[0] : 'qq';
        $appid = 'PL' . strtoupper(bin2hex(random_bytes(6)));
        $appkey = bin2hex(random_bytes(16));
        $ins = pl_pdo()->prepare('INSERT INTO pl_apps (appid, appkey, uid, name, type, types, status, domain_limit, addtime) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)');
        $ins->execute([$appid, $appkey, (int) $user['uid'], $name, $type, $types, $domains !== '' ? 1 : 0, pl_now()]);
        self::saveDomains($appid, $domains);
        pl_record_log((int) $user['uid'], 'create_app');
        pl_ok([], '应用创建成功');
    }

    private static function normalizeAppTypes(string $raw): string
    {
        $enabled = [];
        foreach (pl_platform_rows() as $r) {
            if (!empty($r['enabled'])) {
                $enabled[] = (string) $r['type'];
            }
        }
        if ($raw === '') {
            return '';
        }
        $list = preg_split('/[\s,;]+/', $raw) ?: [];
        $out = [];
        foreach ($list as $t) {
            $t = trim($t);
            if ($t !== '' && in_array($t, $enabled, true) && !in_array($t, $out, true)) {
                $out[] = $t;
            }
        }
        return implode(',', $out);
    }

    private static function saveDomains(string $appid, string $raw): void
    {
        pl_pdo()->prepare('DELETE FROM pl_appdomain WHERE appid = ?')->execute([$appid]);
        $list = preg_split('/[\s,;]+/', $raw) ?: [];
        $ins = pl_pdo()->prepare('INSERT INTO pl_appdomain (appid, domain) VALUES (?, ?)');
        $seen = [];
        foreach ($list as $d) {
            $d = strtolower(trim($d));
            if ($d === '' || isset($seen[$d])) {
                continue;
            }
            $seen[$d] = true;
            $ins->execute([$appid, mb_substr($d, 0, 120)]);
        }
    }

    private static function appUpdate(): void
    {
        self::method('POST');
        $user = pl_require_login();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_apps WHERE id = ? AND uid = ? LIMIT 1');
        $stmt->execute([$id, (int) $user['uid']]);
        $app = $stmt->fetch();
        if (!$app) {
            pl_err('应用不存在');
        }
        $name = pl_in('name');
        $status = (int) pl_in('status', (string) $app['status']);
        $domains = pl_in('domains');
        $typesRaw = pl_in('types');
        $types = $typesRaw === '' ? (string) ($app['types'] ?? '') : self::normalizeAppTypes($typesRaw);
        $type = $types !== '' ? explode(',', $types)[0] : (string) $app['type'];
        $upd = pl_pdo()->prepare('UPDATE pl_apps SET name = ?, type = ?, types = ?, status = ?, domain_limit = ? WHERE id = ?');
        $upd->execute([
            $name !== '' ? $name : $app['name'],
            $type,
            $types,
            $status === 1 ? 1 : 0,
            $domains !== '' ? 1 : 0,
            $id,
        ]);
        self::saveDomains((string) $app['appid'], $domains);
        pl_record_log((int) $user['uid'], 'update_app');
        pl_ok([], '应用已更新');
    }

    private static function appDelete(): void
    {
        self::method('POST');
        $user = pl_require_login();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $stmt = pl_pdo()->prepare('SELECT appid FROM pl_apps WHERE id = ? AND uid = ? LIMIT 1');
        $stmt->execute([$id, (int) $user['uid']]);
        $app = $stmt->fetch();
        if (!$app) {
            pl_err('应用不存在');
        }
        pl_pdo()->prepare('DELETE FROM pl_apps WHERE id = ?')->execute([$id]);
        pl_pdo()->prepare('DELETE FROM pl_appdomain WHERE appid = ?')->execute([$app['appid']]);
        pl_record_log((int) $user['uid'], 'delete_app');
        pl_ok([], '应用已删除');
    }

    private static function appReset(): void
    {
        self::method('POST');
        $user = pl_require_login();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $stmt = pl_pdo()->prepare('SELECT id FROM pl_apps WHERE id = ? AND uid = ? LIMIT 1');
        $stmt->execute([$id, (int) $user['uid']]);
        if (!$stmt->fetch()) {
            pl_err('应用不存在');
        }
        $newKey = bin2hex(random_bytes(16));
        pl_pdo()->prepare('UPDATE pl_apps SET appkey = ? WHERE id = ?')->execute([$newKey, $id]);
        pl_record_log((int) $user['uid'], 'reset_appkey');
        pl_ok(['appkey' => $newKey], 'AppKey 已重置');
    }

    private static function accounts(): void
    {
        $user = pl_require_login();
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_accounts WHERE uid = ? ORDER BY id DESC');
        $stmt->execute([(int) $user['uid']]);
        $rows = $stmt->fetchAll();
        $items = array_map(static fn ($r) => [
            'id' => (int) $r['id'],
            'type' => $r['type'],
            'nickname' => $r['nickname'],
            'faceimg' => $r['faceimg'],
            'addtime' => $r['addtime'],
        ], $rows);
        pl_ok(['items' => $items, 'bindings' => pl_user_public($user)['bound']]);
    }

    private static function accountDelete(): void
    {
        self::method('POST');
        $user = pl_require_login();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_accounts WHERE id = ? AND uid = ? LIMIT 1');
        $stmt->execute([$id, (int) $user['uid']]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('记录不存在');
        }
        pl_pdo()->prepare('DELETE FROM pl_accounts WHERE id = ?')->execute([$id]);
        $field = $row['type'] . '_uid';
        if (in_array($field, ['qq_uid', 'wx_uid', 'alipay_uid'], true)) {
            pl_pdo()->prepare('UPDATE pl_user SET ' . $field . ' = NULL WHERE uid = ?')->execute([(int) $user['uid']]);
        }
        pl_record_log((int) $user['uid'], 'unbind_' . $row['type']);
        pl_ok([], '已解除绑定');
    }

    private static function logs(): void
    {
        $user = pl_require_login();
        $page = max(1, (int) pl_in('page', '1'));
        $size = 15;
        $offset = ($page - 1) * $size;
        $pdo = pl_pdo();
        $c = $pdo->prepare('SELECT COUNT(*) FROM pl_userlog WHERE uid = ?');
        $c->execute([(int) $user['uid']]);
        $total = (int) $c->fetchColumn();
        $stmt = $pdo->prepare('SELECT type, date, ip FROM pl_userlog WHERE uid = ? ORDER BY id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute([(int) $user['uid']]);
        pl_ok(['items' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function captchaGet(): void
    {
        $enabled = (int) pl_conf('captcha_enable', '0') === 1;
        if (!$enabled) {
            pl_ok(['enabled' => false]);
            return;
        }
        $apiUrl = rtrim((string) pl_conf('captcha_api_url', 'https://captcha.idcbdy.com'), '/');
        $accessKey = (string) pl_conf('captcha_access_key', '');
        $captchaType = (string) pl_conf('captcha_type', 'slider');
        $mode = (string) pl_conf('captcha_mode', 'popup');
        if ($accessKey === '') {
            pl_ok(['enabled' => false, 'msg' => 'AccessKey 未配置']);
            return;
        }
        $url = $apiUrl . '/api/captcha/get?' . http_build_query(['accessKey' => $accessKey, 'type' => $captchaType]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 8]);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($resp === false) {
            pl_ok(['enabled' => true, 'error' => '验证码服务连接失败：' . $err]);
            return;
        }
        $data = json_decode($resp, true);
        if (!is_array($data) || ($data['code'] ?? -1) !== 0) {
            pl_ok(['enabled' => true, 'error' => (string) ($data['msg'] ?? '获取验证码失败')]);
            return;
        }
        $d = is_array($data['data'] ?? null) ? $data['data'] : [];
        pl_ok([
            'enabled' => true,
            'captchaKey' => (string) ($d['captchaKey'] ?? ''),
            'type' => (string) ($d['type'] ?? $captchaType),
            'image' => (string) ($d['image'] ?? ($d['backgroundImage'] ?? '')),
            'templateImage' => (string) ($d['templateImage'] ?? ''),
            'width' => (int) ($d['width'] ?? 340),
            'height' => (int) ($d['height'] ?? 120),
            'expireSeconds' => (int) ($d['expireSeconds'] ?? 120),
            'mode' => $mode,
            'accessKey' => $accessKey,
            'apiUrl' => $apiUrl,
        ]);
    }

    private static function captchaCheck(): void
    {
        self::method('POST');
        $captchaKey = pl_in('captchaKey');
        $verifyData = pl_in('verifyData');
        if ($captchaKey === '' || $verifyData === '') {
            pl_err('缺少验证参数');
        }
        $apiUrl = rtrim((string) pl_conf('captcha_api_url', 'https://captcha.idcbdy.com'), '/');
        $accessKey = (string) pl_conf('captcha_access_key', '');
        $secret = (string) pl_conf('captcha_secret', '');
        $sign = md5($accessKey . $secret . $captchaKey);
        $url = $apiUrl . '/api/captcha/check?' . http_build_query(['accessKey' => $accessKey]);
        $body = json_encode(['captchaKey' => $captchaKey, 'verifyData' => $verifyData], JSON_UNESCAPED_UNICODE);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        ]);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($resp === false) {
            pl_err('验证码服务连接失败：' . $err);
        }
        $data = json_decode($resp, true);
        if (!is_array($data) || ($data['code'] ?? -1) !== 0) {
            pl_err((string) ($data['msg'] ?? '验证失败'));
        }
        if (empty($data['success'])) {
            pl_err('验证码错误，请重试');
        }
        pl_ok([], '验证通过');
    }
}
