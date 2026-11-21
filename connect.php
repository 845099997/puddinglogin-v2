<?php
declare(strict_types=1);

require __DIR__ . '/app/core.php';
require __DIR__ . '/app/Connect.php';

@header('Content-Type: application/json; charset=UTF-8');
@header('Cache-Control: no-store, no-cache, must-revalidate');

function c_base(): string
{
    // 优先使用后台配置的站点地址，未配置时按当前请求 Host 推导，避免写死某一域名
    return pl_self_base();
}

function c_fail(int $errcode, string $msg): void
{
    pl_json(['code' => -1, 'errcode' => $errcode, 'msg' => $msg]);
}

function c_page(string $title, string $msg): void
{
    http_response_code(400);
    header('Content-Type: text/html; charset=UTF-8');
    $t = htmlspecialchars($title, ENT_QUOTES);
    $m = htmlspecialchars($msg, ENT_QUOTES);
    echo '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $t . '</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0B14;color:#E7E9F5;font-family:-apple-system,\'PingFang SC\',sans-serif}.box{max-width:420px;padding:40px;text-align:center}.h{font-size:20px;font-weight:600;margin-bottom:12px}.m{color:#8A8FAB;line-height:1.7;font-size:14px}</style></head><body><div class="box"><div class="h">' . $t . '</div><div class="m">' . $m . '</div></div></body></html>';
    exit;
}

$act = pl_in('act');

if ($act === 'notify') {
    $st = pl_in('st');
    $code = pl_in('code');
    if ($st === '' || $code === '') {
        c_page('授权未完成', '缺少必要的授权参数，请返回应用重新发起登录。');
    }
    $pdo = pl_pdo();
    $stmt = $pdo->prepare('SELECT * FROM pl_connect_flow WHERE state = ? AND expire > ? LIMIT 1');
    $stmt->execute([$st, time()]);
    $flow = $stmt->fetch();
    if (!$flow) {
        c_page('授权已过期', '本次授权状态已失效，请返回应用重新发起登录。');
    }
    $pdo->prepare('DELETE FROM pl_connect_flow WHERE id = ?')->execute([(int) $flow['id']]);
    $redirect = (string) $flow['redirect'];
    $profile = PlOAuth::fetchProfile((string) $flow['type'], $code, c_base() . '/connect.php?act=notify&st=' . $st, $st);
    if (($profile['code'] ?? -1) !== 0) {
        c_page('授权失败', (string) ($profile['msg'] ?? '第三方平台未返回有效凭证。'));
    }
    $socialUid = (string) $profile['social_uid'];
    $type = (string) $flow['type'];
    $nickname = (string) ($profile['nickname'] ?? '');
    $faceimg = (string) ($profile['faceimg'] ?? '');
    $pdo->prepare('DELETE FROM pl_connect_code WHERE expire < ?')->execute([time() - 86400]);
    $myCode = bin2hex(random_bytes(12));
    $ins = $pdo->prepare('INSERT INTO pl_connect_code (code, appid, type, social_uid, nickname, faceimg, location, gender, ip, expire, used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
    $ins->execute([
        $myCode,
        (string) $flow['appid'],
        $type,
        $socialUid,
        $nickname,
        $faceimg,
        (string) ($profile['location'] ?? ''),
        (string) ($profile['gender'] ?? ''),
        pl_client_ip(),
        time() + 300,
    ]);
    $acc = $pdo->prepare('SELECT id FROM pl_accounts WHERE type = ? AND social_uid = ? LIMIT 1');
    $acc->execute([$type, $socialUid]);
    if (!$acc->fetch()) {
        $pdo->prepare('INSERT INTO pl_accounts (uid, type, social_uid, nickname, faceimg, addtime) VALUES (0, ?, ?, ?, ?, ?)')
            ->execute([$type, $socialUid, $nickname, $faceimg, pl_now()]);
    }
    $sep = strpos($redirect, '?') === false ? '?' : '&';
    header('Location: ' . $redirect . $sep . http_build_query(['type' => $type, 'code' => $myCode]));
    exit;
}

$appid = pl_in('appid');
$appkey = pl_in('appkey');
$type = pl_in('type', 'qq');

if ($act === '') {
    c_fail(101, 'no act');
}
if ($appid === '') {
    c_fail(101, 'no appid');
}
if ($appkey === '' && $act !== 'sdk') {
    c_fail(101, 'no appkey');
}

$pdo = pl_pdo();
$stmt = $pdo->prepare('SELECT * FROM pl_apps WHERE appid = ? LIMIT 1');
$stmt->execute([$appid]);
$app = $stmt->fetch();
if (!$app) {
    c_fail(102, '应用appid不存在');
}
if ((int) $app['status'] === 0) {
    c_fail(102, '应用已关闭');
}
if ($act !== 'sdk' && !hash_equals((string) $app['appkey'], $appkey)) {
    c_fail(103, 'appkey不正确');
}
if ($act === 'sdk') {
    $redirectUri = pl_in('redirect_uri');
    $stateIn = pl_in('state');
    $sdkType = trim(pl_in('type'));
    if ($redirectUri === '') {
        c_fail(101, 'no redirect_uri');
    }
    $sdkHost = strtolower((string) parse_url($redirectUri, PHP_URL_HOST));
    if ($sdkHost === '') {
        c_fail(101, 'redirect_uri 不合法');
    }
    if ((int) $app['domain_limit'] !== 1) {
        c_fail(103, '请先在应用设置中填写授权回调域名，才能使用免密钥 SDK 登录');
    }
    $sdkBind = $pdo->prepare('SELECT id FROM pl_appdomain WHERE appid = ? AND domain = ? LIMIT 1');
    $sdkBind->execute([$appid, $sdkHost]);
    if (!$sdkBind->fetch()) {
        c_fail(103, '回调域名未授权');
    }
    $sdkAllow = array_values(array_filter(array_map('trim', explode(',', (string) ($app['types'] ?? '')))));
    if ($sdkType === '') {
        $sdkList = [];
        foreach (pl_platform_rows() as $r) {
            $rt = (string) $r['type'];
            if ((int) $r['status'] !== 1 || empty($r['enabled'])) {
                continue;
            }
            if ($sdkAllow !== [] && !in_array($rt, $sdkAllow, true)) {
                continue;
            }
            $sdkList[] = ['type' => $rt, 'name' => (string) $r['name'], 'color' => (string) $r['color']];
        }
        pl_json(['code' => 0, 'msg' => '', 'appid' => (string) $app['appid'], 'name' => (string) $app['name'], 'types' => $sdkList]);
    }
    if ($sdkAllow !== [] && !in_array($sdkType, $sdkAllow, true)) {
        c_fail(103, '该应用未开放此登录方式');
    }
    $sdkRow = pl_platform_row($sdkType);
    if ($sdkRow === null || (int) $sdkRow['status'] !== 1 || !PlOAuth::enabled($sdkType)) {
        c_fail(103, '该登录方式无法使用');
    }
    $pdo->prepare('DELETE FROM pl_connect_flow WHERE expire < ?')->execute([time()]);
    $sdkFlow = bin2hex(random_bytes(16));
    $sdkIns = $pdo->prepare('INSERT INTO pl_connect_flow (state, appid, type, redirect, expire) VALUES (?, ?, ?, ?, ?)');
    $sdkIns->execute([$sdkFlow, $appid, $sdkType, $redirectUri, time() + 600]);
    $sdkUrl = PlOAuth::authorizeUrl($sdkType, c_base() . '/connect.php?act=notify&st=' . $sdkFlow, $stateIn !== '' ? $stateIn : $sdkFlow, $sdkFlow);
    if ($sdkUrl === '') {
        c_fail(103, '该登录方式无法使用');
    }
    pl_json(['code' => 0, 'msg' => '', 'type' => $sdkType, 'url' => $sdkUrl, 'state' => $sdkFlow]);
}

if ($act === 'login') {
    $redirectUri = pl_in('redirect_uri');
    if ($redirectUri === '') {
        c_fail(101, 'no redirect_uri');
    }
    $state = pl_in('state');
    if ((int) $app['domain_limit'] === 1) {
        $host = (string) parse_url($redirectUri, PHP_URL_HOST);
        $d = $pdo->prepare('SELECT id FROM pl_appdomain WHERE appid = ? AND domain = ? LIMIT 1');
        $d->execute([$appid, $host]);
        if (!$d->fetch()) {
            c_fail(103, '回调域名未授权');
        }
    }
    $appTypes = array_values(array_filter(array_map('trim', explode(',', (string) ($app['types'] ?? '')))));
    if ($appTypes !== [] && !in_array($type, $appTypes, true)) {
        c_fail(103, '该应用未开放此登录方式');
    }
    $pRow = pl_platform_row($type);
    if ($pRow === null || (int) $pRow['status'] !== 1) {
        c_fail(103, '该登录方式无法使用');
    }
    $pMode = (string) $pRow['mode'];
    if ($pMode === 'system') {
        if ((string) pl_conf('system_base', '') === '' || (string) pl_conf('system_appid', '') === '' || (string) pl_conf('system_appkey', '') === '') {
            c_fail(103, '该登录方式无法使用');
        }
    } elseif (!PlOAuth::enabled($type)) {
        c_fail(103, '该登录方式无法使用');
    }
    $pdo->prepare('DELETE FROM pl_connect_flow WHERE expire < ?')->execute([time()]);
    $flowState = bin2hex(random_bytes(16));
    $ins = $pdo->prepare('INSERT INTO pl_connect_flow (state, appid, type, redirect, expire) VALUES (?, ?, ?, ?, ?)');
    $ins->execute([$flowState, $appid, $type, $redirectUri, time() + 600]);
    $url = PlOAuth::authorizeUrl($type, c_base() . '/connect.php?act=notify&st=' . $flowState, $state !== '' ? $state : $flowState, $flowState);
    if ($url === '') {
        c_fail(103, '该登录方式无法使用');
    }
    pl_json(['code' => 0, 'msg' => '', 'type' => $type, 'url' => $url, 'state' => $flowState]);
}

if ($act === 'callback') {
    $code = pl_in('code');
    if ($code === '') {
        c_fail(101, 'no code');
    }
    $stmt = $pdo->prepare('SELECT * FROM pl_connect_code WHERE code = ? AND appid = ? LIMIT 1');
    $stmt->execute([$code, $appid]);
    $row = $stmt->fetch();
    if (!$row) {
        pl_json(['code' => 2, 'msg' => '该授权码不存在或已使用']);
    }
    if ((int) $row['used'] === 1) {
        pl_json(['code' => 2, 'msg' => '该授权码已被使用']);
    }
    if ((int) $row['expire'] < time()) {
        pl_json(['code' => 2, 'msg' => '该授权码已过期']);
    }
    $pdo->prepare('UPDATE pl_connect_code SET used = 1 WHERE id = ?')->execute([(int) $row['id']]);
    pl_json([
        'code' => 0,
        'msg' => '',
        'type' => $row['type'],
        'access_token' => hash_hmac('sha256', $row['type'] . ':' . $row['social_uid'], PL_SYS_KEY),
        'social_uid' => $row['social_uid'],
        'faceimg' => $row['faceimg'],
        'nickname' => $row['nickname'],
        'location' => $row['location'],
        'gender' => $row['gender'],
        'ip' => $row['ip'],
    ]);
}

if ($act === 'query') {
    $socialUid = pl_in('social_uid');
    if ($socialUid === '') {
        c_fail(101, 'social_uid不能为空');
    }
    $stmt = $pdo->prepare('SELECT * FROM pl_accounts WHERE type = ? AND social_uid = ? LIMIT 1');
    $stmt->execute([$type, $socialUid]);
    $row = $stmt->fetch();
    if (!$row) {
        pl_json(['code' => 2, 'msg' => '未查询到该用户']);
    }
    pl_json([
        'code' => 0,
        'msg' => '',
        'type' => $row['type'],
        'social_uid' => $row['social_uid'],
        'faceimg' => $row['faceimg'],
        'nickname' => $row['nickname'],
    ]);
}

c_fail(101, 'no act');
