<?php
declare(strict_types=1);

final class PlatformApi
{
    public static function dispatch(string $act): void
    {
        switch ($act) {
            case 'platform.list':
                self::listAll();
                break;
            case 'platform.save':
                self::save();
                break;
            case 'platform.toggle':
                self::toggle();
                break;
            case 'platform.test':
                self::test();
                break;
            case 'platform.probe':
                self::probe();
                break;
            case 'platform.accounts':
                self::accounts();
                break;
            case 'platform.logs':
                self::logs();
                break;
            default:
                pl_err('未知的平台接口', -4, 404);
        }
    }

    private static function method(string $expect): void
    {
        if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== $expect) {
            pl_err('请求方式错误', -4, 405);
        }
    }

    private static function creds(string $type): array
    {
        return [
            'appid' => (string) pl_conf('oauth_' . $type . '_appid', ''),
            'appkey' => (string) pl_conf('oauth_' . $type . '_appkey', ''),
        ];
    }

    private static function row(string $type): array
    {
        $stmt = pl_pdo()->prepare('SELECT * FROM pl_platform WHERE type = ? LIMIT 1');
        $stmt->execute([$type]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('接口不存在');
        }
        return $row;
    }

    private static function listAll(): void
    {
        pl_require_admin();
        $items = [];
        foreach (pl_platform_rows() as $r) {
            $c = self::creds($r['type']);
            $items[] = [
                'type' => $r['type'],
                'name' => $r['name'],
                'icon' => $r['icon'],
                'color' => $r['color'],
                'group' => $r['group'],
                'mode' => $r['mode'],
                'status' => $r['status'],
                'sort' => $r['sort'],
                'link' => $r['link'],
                'note' => $r['note'],
                'callback' => pl_self_base() . '/connect.php?act=notify',
                'appid' => $c['appid'],
                'appkey_set' => $c['appkey'] !== '',
                'configured' => $r['mode'] === 'system' ? true : $r['configured'],
                'components' => self::accountComponents($r['type']),
                'logs' => self::logCount($r['type']),
            ];
        }
        pl_ok([
            'items' => $items,
            'total' => count($items),
            'opened' => count(array_filter($items, static fn ($i) => $i['status'] === 1)),
            'system' => [
                'base' => (string) pl_conf('system_base', ''),
                'appid' => (string) pl_conf('system_appid', ''),
                'appkey_set' => (string) pl_conf('system_appkey', '') !== '',
            ],
            'rainbow' => [
                'api' => (string) pl_conf('rainbow_api', ''),
                'appid' => (string) pl_conf('rainbow_appid', ''),
                'appkey_set' => (string) pl_conf('rainbow_appkey', '') !== '',
            ],
        ]);
    }

    private static function accountComponents(string $type): int
    {
        $stmt = pl_pdo()->prepare('SELECT COUNT(*) FROM pl_accounts WHERE type = ?');
        $stmt->execute([$type]);
        return (int) $stmt->fetchColumn();
    }

    private static function logCount(string $type): int
    {
        $stmt = pl_pdo()->prepare('SELECT COUNT(*) FROM pl_userlog WHERE type = ?');
        $stmt->execute([$type]);
        return (int) $stmt->fetchColumn();
    }

    private static function save(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $type = pl_in('type');
        $row = self::row($type);
        $changed = [];

        $mode = pl_in('mode');
        if ($mode !== '' && in_array($mode, ['official', 'system', 'rainbow'], true) && $mode !== (string) $row['mode']) {
            pl_pdo()->prepare('UPDATE pl_platform SET mode = ?, updatetime = ? WHERE type = ?')
                ->execute([$mode, pl_now(), $type]);
            $changed[] = 'mode';
        }

        $showname = pl_in('showname');
        if ($showname !== '' && $showname !== (string) $row['showname']) {
            pl_pdo()->prepare('UPDATE pl_platform SET showname = ?, updatetime = ? WHERE type = ?')
                ->execute([mb_substr($showname, 0, 32), pl_now(), $type]);
            $changed[] = 'showname';
        }

        $sort = pl_in('sort');
        if ($sort !== '' && (int) $sort !== (int) $row['sort']) {
            pl_pdo()->prepare('UPDATE pl_platform SET sort = ?, updatetime = ? WHERE type = ?')
                ->execute([(int) $sort, pl_now(), $type]);
            $changed[] = 'sort';
        }

        // 官方申请入口为程序内置只读信息，不接受前端提交值覆盖

        $appid = pl_in('appid', '__UNSET__');
        if ($appid !== '__UNSET__') {
            $old = (string) pl_conf('oauth_' . $type . '_appid', '');
            if ($old !== $appid) {
                pl_conf_set('oauth_' . $type . '_appid', mb_substr($appid, 0, 255));
                $changed[] = 'appid';
            }
        }

        $appkey = pl_in('appkey', '__UNSET__');
        if ($appkey !== '__UNSET__' && $appkey !== '' && strpos($appkey, '*') === false) {
            $old = (string) pl_conf('oauth_' . $type . '_appkey', '');
            if ($old !== $appkey) {
                pl_conf_set('oauth_' . $type . '_appkey', mb_substr($appkey, 0, 255));
                $changed[] = 'appkey';
            }
        }

        if ($type === 'puddingchat') {
            foreach (['authorize', 'token', 'userinfo'] as $k) {
                $v = pl_in('endpoint_' . $k, '__UNSET__');
                if ($v === '__UNSET__') {
                    continue;
                }
                $confKey = 'oauth_puddingchat_' . $k;
                $old = (string) pl_conf($confKey, '');
                if ($old !== $v) {
                    pl_conf_set($confKey, mb_substr($v, 0, 255));
                    $changed[] = 'endpoint_' . $k;
                }
            }
        }

        if ($mode === 'system') {
            foreach (['base', 'appid', 'appkey'] as $k) {
                $v = pl_in('system_' . $k, '__UNSET__');
                if ($v === '__UNSET__') {
                    continue;
                }
                if ($k === 'appkey' && ($v === '' || strpos($v, '*') !== false)) {
                    continue;
                }
                $confKey = 'system_' . $k;
                $old = (string) pl_conf($confKey, '');
                if ($old !== $v) {
                    pl_conf_set($confKey, mb_substr($v, 0, 255));
                    $changed[] = 'system_' . $k;
                }
            }
        }

        if ($mode === 'rainbow') {
            foreach (['api', 'appid', 'appkey'] as $k) {
                $v = pl_in('rainbow_' . $k, '__UNSET__');
                if ($v === '__UNSET__') {
                    continue;
                }
                if ($k === 'appkey' && ($v === '' || strpos($v, '*') !== false)) {
                    continue;
                }
                $confKey = 'rainbow_' . $k;
                $old = (string) pl_conf($confKey, '');
                if ($old !== $v) {
                    pl_conf_set($confKey, mb_substr($v, 0, 255));
                    $changed[] = 'rainbow_' . $k;
                }
            }
        }

        if ($changed !== []) {
            pl_admin_log((int) $admin['uid'], 'platform.save', $type . '：' . implode(',', $changed));
        }
        pl_ok(['changed' => $changed], $changed === [] ? '没有需要保存的变更' : '配置已保存并立即生效');
    }

    private static function toggle(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $type = pl_in('type');
        $row = self::row($type);
        $next = (int) $row['status'] === 1 ? 0 : 1;
        $mode = (string) $row['mode'];
        if ($next === 1 && $mode === 'rainbow') {
            if (!PlRainbow::ready()) {
                pl_err('请先配置彩虹聚合网关地址、AppID 与 AppKey');
            }
        } elseif ($next === 1 && $mode !== 'system') {
            $c = self::creds($type);
            if ($c['appid'] === '' || $c['appkey'] === '') {
                pl_err('请先配置该接口的密钥');
            }
        }
        pl_pdo()->prepare('UPDATE pl_platform SET status = ?, updatetime = ? WHERE type = ?')
            ->execute([$next, pl_now(), $type]);
        pl_admin_log((int) $admin['uid'], 'platform.toggle', $type . ' -> ' . ($next === 1 ? '开启' : '关闭'));
        pl_ok(['type' => $type, 'status' => $next], $next === 1 ? '已开启' : '已关闭');
    }

    private static function test(): void
    {
        pl_require_admin();
        $type = pl_in('type');
        $row = self::row($type);
        $c = self::creds($type);
        $t0 = microtime(true);
        $mode = (string) $row['mode'];
        $result = ['ok' => false, 'stage' => '', 'detail' => '', 'url' => ''];

        if ($mode === 'rainbow') {
            $pr = PlRainbow::probe($type);
            pl_admin_log((int) pl_require_admin()['uid'], 'platform.test', $type . '：' . ($pr['ok'] ? '通过' : '未通过'));
            pl_ok(['type' => $type, 'mode' => $mode, 'result' => $pr]);
        }

        if ($c['appid'] === '' || $c['appkey'] === '') {
            $result['stage'] = 'credential';
            $result['detail'] = '尚未配置 AppID 或 AppKey';
            $result['elapsed_ms'] = (int) round((microtime(true) - $t0) * 1000);
            pl_ok(['type' => $type, 'mode' => $mode, 'result' => $result]);
        }

        if ($mode === 'official') {
            if (!PlOAuth::enabled($type)) {
                $result['stage'] = 'credential';
                $result['detail'] = '凭据不完整';
            } else {
                $redirect = pl_self_base() . '/connect.php?act=notify&st=TESTSTATE';
                $url = PlOAuth::authorizeUrl($type, $redirect, 'TESTSTATE', 'TESTSTATE');
                if ($url === '') {
                    $result['stage'] = 'authorize';
                    $result['detail'] = '未能生成授权地址，请检查该平台配置';
                } else {
                    $host = (string) parse_url($url, PHP_URL_HOST);
                    $result['ok'] = true;
                    $result['stage'] = 'authorize';
                    $result['url'] = $url;
                    $result['detail'] = '授权地址已生成，目标域名 ' . $host;
                }
            }
        } else {
            $result['stage'] = 'system';
            $base = (string) pl_conf('system_base', '');
            if ($base === '' || (string) pl_conf('system_appid', '') === '' || (string) pl_conf('system_appkey', '') === '') {
                $result['ok'] = false;
                $result['detail'] = '同系统对接需配置远端接口地址、AppID 与 AppKey';
            } else {
                $result['ok'] = true;
                $result['detail'] = '同系统对接模式，远端地址 ' . parse_url($base, PHP_URL_HOST);
            }
        }

        $result['elapsed_ms'] = (int) round((microtime(true) - $t0) * 1000);
        pl_admin_log((int) pl_require_admin()['uid'], 'platform.test', $type . '：' . ($result['ok'] ? '通过' : '未通过'));
        pl_ok(['type' => $type, 'mode' => $mode, 'result' => $result]);
    }

    private static function probe(): void
    {
        pl_require_admin();
        $type = pl_in('type');
        $row = self::row($type);
        $mode = (string) $row['mode'];
        $force = pl_in('force') === '1';
        $cacheKey = 'platform_probe_cache';
        $cache = json_decode((string) pl_conf($cacheKey, ''), true);
        if (!is_array($cache)) {
            $cache = [];
        }
        $now = time();
        if (!$force && isset($cache[$type]) && is_array($cache[$type]) && $now - (int) ($cache[$type]['ts'] ?? 0) < 60) {
            pl_ok(['type' => $type, 'mode' => $mode, 'cached' => true, 'result' => $cache[$type]['result']]);
        }
        $t0 = microtime(true);
        if ($mode === 'rainbow') {
            $result = PlRainbow::probe($type);
        } elseif ($mode === 'system') {
            $base = (string) pl_conf('system_base', '');
            $ok = $base !== '' && (string) pl_conf('system_appid', '') !== '' && (string) pl_conf('system_appkey', '') !== '';
            $result = ['ok' => $ok, 'stage' => 'system', 'detail' => $ok ? '同系统对接配置完整' : '同系统对接配置不完整', 'url' => '', 'elapsed_ms' => (int) round((microtime(true) - $t0) * 1000)];
        } else {
            $c = self::creds($type);
            if ($c['appid'] === '' || $c['appkey'] === '') {
                $result = ['ok' => false, 'stage' => 'credential', 'detail' => '尚未配置 AppID 或 AppKey', 'url' => '', 'elapsed_ms' => 0];
            } else {
                $url = PlOAuth::authorizeUrl($type, pl_self_base() . '/connect.php?act=notify&st=PROBE', 'PROBE', 'PROBE');
                $result = $url === ''
                    ? ['ok' => false, 'stage' => 'authorize', 'detail' => '未能生成授权地址', 'url' => '', 'elapsed_ms' => (int) round((microtime(true) - $t0) * 1000)]
                    : ['ok' => true, 'stage' => 'authorize', 'detail' => '授权地址已生成', 'url' => $url, 'elapsed_ms' => (int) round((microtime(true) - $t0) * 1000)];
            }
        }
        $cache[$type] = ['ts' => $now, 'result' => $result];
        pl_conf_set($cacheKey, json_encode($cache, JSON_UNESCAPED_UNICODE));
        pl_ok(['type' => $type, 'mode' => $mode, 'cached' => false, 'result' => $result]);
    }

    private static function accounts(): void
    {
        pl_require_admin();
        $type = pl_in('type');
        $page = max(1, (int) pl_in('page', '1'));
        $size = min(100, max(1, (int) pl_in('size', '20')));
        $kw = trim(pl_in('kw'));
        $where = 'WHERE a.type = ?';
        $args = [$type];
        if ($kw !== '') {
            $where .= ' AND (a.social_uid LIKE ? OR a.nickname LIKE ? OR u.username LIKE ?)';
            $like = '%' . $kw . '%';
            $args[] = $like;
            $args[] = $like;
            $args[] = $like;
        }
        $pdo = pl_pdo();
        $cs = $pdo->prepare('SELECT COUNT(*) FROM pl_accounts a LEFT JOIN pl_user u ON u.uid = a.uid ' . $where);
        $cs->execute($args);
        $total = (int) $cs->fetchColumn();
        $offset = ($page - 1) * $size;
        $stmt = $pdo->prepare('SELECT a.id, a.uid, a.social_uid, a.nickname, a.faceimg, a.addtime, u.username FROM pl_accounts a LEFT JOIN pl_user u ON u.uid = a.uid ' . $where . ' ORDER BY a.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'id' => (int) $r['id'],
                'uid' => (int) $r['uid'],
                'username' => (string) ($r['username'] ?? ''),
                'social_uid' => (string) $r['social_uid'],
                'nickname' => (string) ($r['nickname'] ?? ''),
                'faceimg' => (string) ($r['faceimg'] ?? ''),
                'addtime' => (string) ($r['addtime'] ?? ''),
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function logs(): void
    {
        pl_require_admin();
        $type = pl_in('type');
        $page = max(1, (int) pl_in('page', '1'));
        $size = min(100, max(1, (int) pl_in('size', '20')));
        $pdo = pl_pdo();
        $cs = $pdo->prepare('SELECT COUNT(*) FROM pl_userlog l LEFT JOIN pl_user u ON u.uid = l.uid WHERE l.type LIKE ?');
        $cs->execute(['%' . $type . '%']);
        $total = (int) $cs->fetchColumn();
        $offset = ($page - 1) * $size;
        $stmt = $pdo->prepare('SELECT l.id, l.uid, l.type, l.date, l.ip, l.ua, u.username FROM pl_userlog l LEFT JOIN pl_user u ON u.uid = l.uid WHERE l.type LIKE ? ORDER BY l.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute(['%' . $type . '%']);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = [
                'id' => (int) $r['id'],
                'uid' => (int) $r['uid'],
                'username' => (string) ($r['username'] ?? ''),
                'type' => (string) $r['type'],
                'date' => (string) ($r['date'] ?? ''),
                'ip' => (string) ($r['ip'] ?? ''),
                'ua' => (string) ($r['ua'] ?? ''),
            ];
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }
}

