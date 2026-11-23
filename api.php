<?php
declare(strict_types=1);
/**
 * PuddingLogin v2.1.8 - MIT License
 * 开源统一身份认证系统 · https://gitee.com/budingyun6/puddinglogin-v2
 */

require __DIR__ . '/app/core.php';
require __DIR__ . '/app/Connect.php';
require __DIR__ . '/app/Api.php';
require __DIR__ . '/app/AdminApi.php';
require __DIR__ . '/app/PlatformApi.php';
require __DIR__ . '/app/TicketApi.php';
require __DIR__ . '/app/SystemApi.php';

header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $originHost = parse_url($origin, PHP_URL_HOST);
    if ($originHost && $host && strcasecmp($originHost, (string) parse_url('http://' . $host, PHP_URL_HOST)) === 0) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    http_response_code(204);
    exit;
}

$act = pl_in('act');
if ($act === '') {
    pl_err('缺少 act 参数', -4, 400);
}

try {
    Api::dispatch($act);
} catch (PDOException $e) {
    error_log('[PL][PDO] ' . $e->getMessage());
    pl_err('数据库暂时不可用，请稍后重试', -500, 500);
} catch (Throwable $e) {
    error_log('[PL][ERR] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    pl_err('服务异常，请稍后重试', -500, 500);
}
