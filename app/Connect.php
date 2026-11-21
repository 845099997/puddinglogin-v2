<?php
declare(strict_types=1);

final class PlRainbow
{
    private const TYPES = ['qq', 'wx', 'sina', 'google', 'microsoft', 'facebook', 'twitter', 'gitee', 'github', 'puddingchat'];

    public static function config(): array
    {
        return [
            'api' => rtrim((string) pl_conf('rainbow_api', ''), '/'),
            'appid' => (string) pl_conf('rainbow_appid', ''),
            'appkey' => (string) pl_conf('rainbow_appkey', ''),
        ];
    }

    public static function ready(): bool
    {
        $c = self::config();
        return $c['api'] !== '' && $c['appid'] !== '' && $c['appkey'] !== '';
    }

    public static function supported(string $type): bool
    {
        return in_array($type, self::TYPES, true);
    }

    private static function endpoints(string $api): array
    {
        if (preg_match('#[.]php$#i', $api) === 1) {
            return [$api];
        }
        return [
            $api . '/connect.php',
            $api . '/user/connect.php',
            $api,
            $api . '/index.php',
            $api . '/api.php',
            $api . '/login/connect.php',
            $api . '/api/connect.php',
        ];
    }

    private static function httpGet(string $url, int $timeout = 6): string
    {
        if (!function_exists('curl_init')) {
            $out = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => $timeout, 'ignore_errors' => true]]));
            return $out === false ? '' : (string) $out;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'PuddingLogin/2.1.4 RainbowGateway',
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        return $out === false ? '' : (string) $out;
    }

    public static function query(array $params): array
    {
        $c = self::config();
        if ($c['api'] === '') {
            return ['ok' => false, 'data' => [], 'endpoint' => '', 'raw' => ''];
        }
        $params['appid'] = $c['appid'];
        $params['appkey'] = $c['appkey'];
        $qs = http_build_query($params);
        $raw = '';
        foreach (self::endpoints($c['api']) as $ep) {
            $raw = self::httpGet($ep . '?' . $qs);
            $j = json_decode($raw, true);
            if (is_array($j)) {
                return ['ok' => true, 'data' => $j, 'endpoint' => $ep, 'raw' => $raw];
            }
        }
        return ['ok' => false, 'data' => [], 'endpoint' => '', 'raw' => $raw];
    }

    public static function authorizeUrl(string $type, string $redirect, string $state): string
    {
        if (!self::ready() || !self::supported($type)) {
            return '';
        }
        $r = self::query(['act' => 'login', 'type' => $type, 'redirect_uri' => $redirect, 'state' => $state]);
        if (!$r['ok'] || (int) ($r['data']['code'] ?? -1) !== 0) {
            return '';
        }
        $url = (string) ($r['data']['url'] ?? '');
        if ($url === '') {
            $url = (string) ($r['data']['qrcode'] ?? '');
        }
        return $url;
    }

    public static function profile(string $type, string $code): array
    {
        if (!self::ready() || !self::supported($type)) {
            return ['code' => -1, 'msg' => '彩虹聚合登录未配置或不支持该登录方式'];
        }
        $r = self::query(['act' => 'callback', 'type' => $type, 'code' => $code]);
        if (!$r['ok']) {
            return ['code' => -1, 'msg' => '彩虹聚合网关无有效响应'];
        }
        if ((int) ($r['data']['code'] ?? -1) !== 0) {
            return ['code' => -1, 'msg' => (string) ($r['data']['msg'] ?? '彩虹聚合登录授权失败')];
        }
        $uid = (string) ($r['data']['social_uid'] ?? $r['data']['openid'] ?? $r['data']['id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '彩虹聚合登录未返回用户标识'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($r['data']['nickname'] ?? $r['data']['username'] ?? '彩虹用户'),
            'faceimg' => (string) ($r['data']['faceimg'] ?? $r['data']['avatar'] ?? ''),
            'gender' => (string) ($r['data']['gender'] ?? ''),
            'location' => (string) ($r['data']['location'] ?? ''),
            'access_token' => (string) ($r['data']['access_token'] ?? ''),
            'ip' => (string) ($r['data']['ip'] ?? ''),
        ];
    }

    public static function probe(string $type): array
    {
        $t0 = microtime(true);
        $c = self::config();
        if ($c['api'] === '' || $c['appid'] === '' || $c['appkey'] === '') {
            return ['ok' => false, 'stage' => 'credential', 'detail' => '尚未配置彩虹聚合网关地址、AppID 或 AppKey', 'url' => '', 'endpoint' => '', 'elapsed_ms' => 0];
        }
        $r = self::query([
            'act' => 'login',
            'type' => $type,
            'redirect_uri' => pl_self_base() . '/connect.php?act=notify&st=RAINBOWPROBE',
            'state' => 'RAINBOWPROBE',
        ]);
        $ms = (int) round((microtime(true) - $t0) * 1000);
        if (!$r['ok']) {
            return ['ok' => false, 'stage' => 'endpoint', 'detail' => '网关未返回 JSON，请检查接口地址', 'url' => '', 'endpoint' => '', 'elapsed_ms' => $ms];
        }
        $code = (int) ($r['data']['code'] ?? -1);
        if ($code !== 0) {
            $msg = (string) ($r['data']['msg'] ?? '');
            return ['ok' => false, 'stage' => 'authorize', 'detail' => '网关返回：' . ($msg !== '' ? $msg : 'code=' . $code), 'url' => '', 'endpoint' => (string) $r['endpoint'], 'elapsed_ms' => $ms];
        }
        $url = (string) ($r['data']['url'] ?? '');
        $host = $url !== '' ? (string) parse_url($url, PHP_URL_HOST) : '';
        return ['ok' => true, 'stage' => 'authorize', 'detail' => '网关连通' . ($host !== '' ? '，授权目标 ' . $host : ''), 'url' => $url, 'endpoint' => (string) $r['endpoint'], 'elapsed_ms' => $ms];
    }
}

final class PlOAuth
{
    public static function appId(string $type): string
    {
        return (string) pl_conf('oauth_' . $type . '_appid', '');
    }

    public static function appKey(string $type): string
    {
        return (string) pl_conf('oauth_' . $type . '_appkey', '');
    }

    public static function enabled(string $type): bool
    {
        $row = pl_platform_row($type);
        if ($row !== null && (string) $row['mode'] === 'rainbow') {
            return PlRainbow::ready() && PlRainbow::supported($type);
        }
        return self::appId($type) !== '' && self::appKey($type) !== '';
    }

    public static function authorizeUrl(string $type, string $redirect, string $state, string $pkceSeed = ''): string
    {
        $pRow = pl_platform_row($type);
        if ($pRow !== null && (string) $pRow['mode'] === 'rainbow') {
            return PlRainbow::authorizeUrl($type, $redirect, $state);
        }
        if ($pRow !== null && (string) $pRow['mode'] === 'system') {
            $base = rtrim((string) pl_conf('system_base', ''), '/');
            $sysAppid = (string) pl_conf('system_appid', '');
            $sysAppkey = (string) pl_conf('system_appkey', '');
            if ($base !== '' && $sysAppid !== '' && $sysAppkey !== '') {
                $remote = self::parse(self::curlGet($base . '/connect.php?' . http_build_query([
                    'act' => 'login',
                    'appid' => $sysAppid,
                    'appkey' => $sysAppkey,
                    'type' => $type,
                    'redirect_uri' => $redirect,
                    'state' => $state,
                ])));
                return (string) ($remote['url'] ?? '');
            }
            return '';
        }
        $appid = self::appId($type);
        switch ($type) {
            case 'qq':
                return 'https://graph.qq.com/oauth2.0/authorize?' . http_build_query([
                    'response_type' => 'code',
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'state' => $state,
                    'scope' => 'get_user_info',
                ]);
            case 'wx':
                return 'https://open.weixin.qq.com/connect/qrconnect?' . http_build_query([
                    'appid' => $appid,
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'scope' => 'snsapi_login',
                    'state' => $state,
                ]) . '#wechat_redirect';
            case 'alipay':
                return 'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?' . http_build_query([
                    'app_id' => $appid,
                    'scope' => 'auth_user',
                    'redirect_uri' => $redirect,
                    'state' => $state,
                ]);
            case 'github':
                return 'https://github.com/login/oauth/authorize?' . http_build_query([
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'state' => $state,
                    'scope' => 'read:user',
                ]);
            case 'gitee':
                return 'https://gitee.com/oauth/authorize?' . http_build_query([
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'state' => $state,
                ]);
            case 'google':
                return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'scope' => 'openid email profile',
                    'state' => $state,
                ]);
            case 'facebook':
                return 'https://www.facebook.com/v18.0/dialog/oauth?' . http_build_query([
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'scope' => 'email,public_profile',
                    'state' => $state,
                ]);
            case 'twitter':
                $seed = $pkceSeed !== '' ? $pkceSeed : $state;
                $challenge = rtrim(strtr(base64_encode(hash('sha256', self::twitterVerifier($seed), true)), '+/', '-_'), '=');
                return 'https://twitter.com/i/oauth2/authorize?' . http_build_query([
                    'response_type' => 'code',
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'scope' => 'tweet.read users.read',
                    'state' => $state,
                    'code_challenge' => $challenge,
                    'code_challenge_method' => 'S256',
                ]);
            case 'microsoft':
                return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' . http_build_query([
                    'client_id' => $appid,
                    'response_type' => 'code',
                    'redirect_uri' => $redirect,
                    'response_mode' => 'query',
                    'scope' => 'openid profile email User.Read',
                    'state' => $state,
                ]);
            case 'baidu':
                return 'https://openapi.baidu.com/oauth/2.0/authorize?' . http_build_query([
                    'response_type' => 'code',
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'scope' => 'basic',
                    'state' => $state,
                ]);
            case 'sina':
                return 'https://api.weibo.com/oauth2/authorize?' . http_build_query([
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'state' => $state,
                ]);
            case 'dingtalk':
                return 'https://login.dingtalk.com/oauth2/auth?' . http_build_query([
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'client_id' => $appid,
                    'scope' => 'openid',
                    'state' => $state,
                    'prompt' => 'consent',
                ]);
            case 'xiaomi':
                return 'https://account.xiaomi.com/oauth2/authorize?' . http_build_query([
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'response_type' => 'code',
                    'scope' => '1,3,6000',
                    'state' => $state,
                ]);
            case 'huawei':
                return 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize?' . http_build_query([
                    'response_type' => 'code',
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'scope' => 'openid profile',
                    'state' => $state,
                ]);
            case 'puddingchat':
                $authUrl = (string) pl_conf('oauth_puddingchat_authorize', '');
                if ($authUrl === '') {
                    return '';
                }
                return $authUrl . (strpos($authUrl, '?') === false ? '?' : '&') . http_build_query([
                    'response_type' => 'code',
                    'client_id' => $appid,
                    'redirect_uri' => $redirect,
                    'state' => $state,
                ]);
        }
        return '';
    }

    public static function fetchProfile(string $type, string $code, string $redirect, string $state = ''): array
    {
        $pRow = pl_platform_row($type);
        if ($pRow !== null && (string) $pRow['mode'] === 'rainbow') {
            return PlRainbow::profile($type, $code);
        }
        if ($pRow !== null && (string) $pRow['mode'] === 'system') {
            $base = rtrim((string) pl_conf('system_base', ''), '/');
            $sysAppid = (string) pl_conf('system_appid', '');
            $sysAppkey = (string) pl_conf('system_appkey', '');
            if ($base === '' || $sysAppid === '' || $sysAppkey === '') {
                return ['code' => -1, 'msg' => '同系统对接未完整配置'];
            }
            $resp = self::parse(self::curlGet($base . '/connect.php?' . http_build_query([
                'act' => 'callback',
                'appid' => $sysAppid,
                'appkey' => $sysAppkey,
                'code' => $code,
            ])));
            if (($resp['code'] ?? -1) !== 0) {
                return ['code' => -1, 'msg' => (string) ($resp['msg'] ?? '远端系统返回失败')];
            }
            return [
                'code' => 0,
                'social_uid' => (string) ($resp['social_uid'] ?? ''),
                'nickname' => (string) ($resp['nickname'] ?? '系统用户'),
                'faceimg' => (string) ($resp['faceimg'] ?? ''),
                'gender' => (string) ($resp['gender'] ?? ''),
                'location' => (string) ($resp['location'] ?? ''),
                'access_token' => (string) ($resp['access_token'] ?? ''),
            ];
        }
        switch ($type) {
            case 'qq':
                return self::qqProfile($code, $redirect);
            case 'wx':
                return self::wxProfile($code);
            case 'alipay':
                return self::alipayProfile($code);
            case 'github':
                return self::githubProfile($code, $redirect);
            case 'gitee':
                return self::giteeProfile($code, $redirect);
            case 'google':
                return self::googleProfile($code, $redirect);
            case 'facebook':
                return self::facebookProfile($code, $redirect);
            case 'twitter':
                return self::twitterProfile($code, $redirect, $state);
            case 'microsoft':
                return self::microsoftProfile($code, $redirect);
            case 'baidu':
                return self::baiduProfile($code, $redirect);
            case 'sina':
                return self::sinaProfile($code, $redirect);
            case 'dingtalk':
                return self::dingtalkProfile($code);
            case 'xiaomi':
                return self::xiaomiProfile($code, $redirect);
            case 'huawei':
                return self::huaweiProfile($code, $redirect);
            case 'puddingchat':
                return self::customProfile($code, $redirect);
        }
        return ['code' => -1, 'msg' => '不支持的登录方式'];
    }

    private static function curlGet(string $url): string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $body = curl_exec($ch);
        if ($body === false) {
            $body = '{"error":"' . curl_error($ch) . '"}';
        }
        curl_close($ch);
        return (string) $body;
    }

    private static function parse(string $body): array
    {
        $body = trim($body);
        if ($body === '') {
            return [];
        }
        if ($body[0] === '{') {
            $json = json_decode($body, true);
            return is_array($json) ? $json : [];
        }
        if (strpos($body, 'callback(') !== false && preg_match('/callback\(\s*(.*?)\s*\);/s', $body, $m)) {
            $json = json_decode($m[1], true);
            return is_array($json) ? $json : [];
        }
        parse_str($body, $out);
        return is_array($out) ? $out : [];
    }

    private static function qqProfile(string $code, string $redirect): array
    {
        $tokenUrl = 'https://graph.qq.com/oauth2.0/token?' . http_build_query([
            'grant_type' => 'authorization_code',
            'client_id' => self::appId('qq'),
            'client_secret' => self::appKey('qq'),
            'code' => $code,
            'redirect_uri' => $redirect,
            'fmt' => 'json',
        ]);
        $token = self::parse(self::curlGet($tokenUrl));
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 QQ 令牌失败'];
        }
        $me = self::parse(self::curlGet('https://graph.qq.com/oauth2.0/me?' . http_build_query([
            'access_token' => $accessToken,
            'fmt' => 'json',
        ])));
        $openid = (string) ($me['openid'] ?? '');
        if ($openid === '') {
            return ['code' => -1, 'msg' => '获取 QQ 用户标识失败'];
        }
        $info = self::parse(self::curlGet('https://graph.qq.com/user/get_user_info?' . http_build_query([
            'access_token' => $accessToken,
            'oauth_consumer_key' => self::appId('qq'),
            'openid' => $openid,
        ])));
        return [
            'code' => 0,
            'social_uid' => $openid,
            'nickname' => (string) ($info['nickname'] ?? 'QQ用户'),
            'faceimg' => (string) ($info['figureurl_qq_2'] ?? ($info['figureurl_qq_1'] ?? '')),
            'gender' => (string) ($info['gender'] ?? ''),
            'location' => (string) ($info['province'] ?? '') . (string) ($info['city'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function wxProfile(string $code): array
    {
        $token = self::parse(self::curlGet('https://api.weixin.qq.com/sns/oauth2/access_token?' . http_build_query([
            'appid' => self::appId('wx'),
            'secret' => self::appKey('wx'),
            'code' => $code,
            'grant_type' => 'authorization_code',
        ])));
        $accessToken = (string) ($token['access_token'] ?? '');
        $openid = (string) ($token['openid'] ?? '');
        if ($accessToken === '' || $openid === '') {
            return ['code' => -1, 'msg' => '获取微信令牌失败'];
        }
        $info = self::parse(self::curlGet('https://api.weixin.qq.com/sns/userinfo?' . http_build_query([
            'access_token' => $accessToken,
            'openid' => $openid,
        ])));
        return [
            'code' => 0,
            'social_uid' => $openid,
            'nickname' => (string) ($info['nickname'] ?? '微信用户'),
            'faceimg' => (string) ($info['headimgurl'] ?? ''),
            'gender' => (string) ($info['sex'] ?? ''),
            'location' => (string) ($info['province'] ?? '') . (string) ($info['city'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function alipayProfile(string $code): array
    {
        $params = [
            'app_id' => self::appId('alipay'),
            'method' => 'alipay.system.oauth.token',
            'charset' => 'utf-8',
            'sign_type' => 'RSA2',
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0',
            'grant_type' => 'authorization_code',
            'code' => $code,
        ];
        $params['sign'] = self::alipaySign($params);
        $body = self::curlGet('https://openapi.alipay.com/gateway.do?' . http_build_query($params));
        $json = json_decode($body, true);
        $accessToken = (string) ($json['alipay_system_oauth_token_response']['access_token'] ?? '');
        $userId = (string) ($json['alipay_system_oauth_token_response']['user_id'] ?? '');
        if ($accessToken === '' || $userId === '') {
            return ['code' => -1, 'msg' => '获取支付宝令牌失败'];
        }
        $infoParams = [
            'app_id' => self::appId('alipay'),
            'method' => 'alipay.user.info.share',
            'charset' => 'utf-8',
            'sign_type' => 'RSA2',
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0',
            'auth_token' => $accessToken,
        ];
        $infoParams['sign'] = self::alipaySign($infoParams);
        $infoJson = json_decode(self::curlGet('https://openapi.alipay.com/gateway.do?' . http_build_query($infoParams)), true);
        $info = $infoJson['alipay_user_info_share_response'] ?? [];
        return [
            'code' => 0,
            'social_uid' => $userId,
            'nickname' => (string) ($info['nick_name'] ?? '支付宝用户'),
            'faceimg' => (string) ($info['avatar'] ?? ''),
            'gender' => (string) ($info['gender'] ?? ''),
            'location' => (string) ($info['province'] ?? '') . (string) ($info['city'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function curlRequest(string $url, array $post = [], array $headers = [], bool $asJson = false): array
    {
        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => $headers,
        ];
        if ($post !== []) {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = $asJson ? (string) json_encode($post) : http_build_query($post);
        }
        curl_setopt_array($ch, $opts);
        $body = curl_exec($ch);
        if ($body === false) {
            $body = (string) json_encode(['error' => curl_error($ch)]);
        }
        curl_close($ch);
        return self::parse((string) $body);
    }

    private static function twitterVerifier(string $state): string
    {
        return substr(hash_hmac('sha256', 'twitter-pkce:' . $state, PL_SYS_KEY), 0, 48);
    }

    private static function githubProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://github.com/login/oauth/access_token', [
            'client_id' => self::appId('github'),
            'client_secret' => self::appKey('github'),
            'code' => $code,
            'redirect_uri' => $redirect,
        ], ['Accept: application/json', 'User-Agent: PuddingLogin']);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 GitHub 令牌失败'];
        }
        $info = self::curlRequest('https://api.github.com/user', [], [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/vnd.github+json',
            'User-Agent: PuddingLogin',
        ]);
        $uid = (string) ($info['id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取 GitHub 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['name'] ?? ($info['login'] ?? 'GitHub 用户')),
            'faceimg' => (string) ($info['avatar_url'] ?? ''),
            'gender' => '',
            'location' => (string) ($info['location'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function giteeProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://gitee.com/oauth/token', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => self::appId('gitee'),
            'client_secret' => self::appKey('gitee'),
            'redirect_uri' => $redirect,
        ], ['Accept: application/json', 'User-Agent: PuddingLogin']);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 Gitee 令牌失败'];
        }
        $info = self::curlRequest('https://gitee.com/api/v5/user?access_token=' . urlencode($accessToken), [], ['User-Agent: PuddingLogin']);
        $uid = (string) ($info['id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取 Gitee 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['name'] ?? ($info['login'] ?? 'Gitee 用户')),
            'faceimg' => (string) ($info['avatar_url'] ?? ''),
            'gender' => '',
            'location' => (string) ($info['location'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function googleProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => self::appId('google'),
            'client_secret' => self::appKey('google'),
            'redirect_uri' => $redirect,
            'grant_type' => 'authorization_code',
        ]);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 Google 令牌失败'];
        }
        $info = self::curlRequest('https://www.googleapis.com/oauth2/v3/userinfo', [], ['Authorization: Bearer ' . $accessToken]);
        $uid = (string) ($info['sub'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取 Google 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['name'] ?? 'Google 用户'),
            'faceimg' => (string) ($info['picture'] ?? ''),
            'gender' => '',
            'location' => (string) ($info['locale'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function facebookProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://graph.facebook.com/v18.0/oauth/access_token?' . http_build_query([
            'client_id' => self::appId('facebook'),
            'client_secret' => self::appKey('facebook'),
            'redirect_uri' => $redirect,
            'code' => $code,
        ]));
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 Facebook 令牌失败'];
        }
        $info = self::curlRequest('https://graph.facebook.com/me?' . http_build_query([
            'fields' => 'id,name,picture.type(large),location',
            'access_token' => $accessToken,
        ]));
        $uid = (string) ($info['id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取 Facebook 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['name'] ?? 'Facebook 用户'),
            'faceimg' => (string) ($info['picture']['data']['url'] ?? ''),
            'gender' => '',
            'location' => (string) ($info['location']['name'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function twitterProfile(string $code, string $redirect, string $state): array
    {
        $basic = base64_encode(self::appId('twitter') . ':' . self::appKey('twitter'));
        $token = self::curlRequest('https://api.twitter.com/2/oauth2/token', [
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirect,
            'code_verifier' => self::twitterVerifier($state),
        ], ['Authorization: Basic ' . $basic, 'Content-Type: application/x-www-form-urlencoded']);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 X 令牌失败'];
        }
        $info = self::curlRequest('https://api.twitter.com/2/users/me?user.fields=profile_image_url', [], ['Authorization: Bearer ' . $accessToken]);
        $data = is_array($info['data'] ?? null) ? $info['data'] : [];
        $uid = (string) ($data['id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取 X 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($data['name'] ?? ($data['username'] ?? 'X 用户')),
            'faceimg' => (string) ($data['profile_image_url'] ?? ''),
            'gender' => '',
            'location' => (string) ($data['location'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function microsoftProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://login.microsoftonline.com/common/oauth2/v2.0/token', [
            'client_id' => self::appId('microsoft'),
            'client_secret' => self::appKey('microsoft'),
            'code' => $code,
            'redirect_uri' => $redirect,
            'grant_type' => 'authorization_code',
            'scope' => 'openid profile email User.Read',
        ]);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取 Microsoft 令牌失败'];
        }
        $info = self::curlRequest('https://graph.microsoft.com/v1.0/me', [], ['Authorization: Bearer ' . $accessToken]);
        $uid = (string) ($info['id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取 Microsoft 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['displayName'] ?? 'Microsoft 用户'),
            'faceimg' => '',
            'gender' => '',
            'location' => (string) ($info['officeLocation'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function baiduProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://openapi.baidu.com/oauth/2.0/token?' . http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => self::appId('baidu'),
            'client_secret' => self::appKey('baidu'),
            'redirect_uri' => $redirect,
        ]));
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取百度令牌失败'];
        }
        $info = self::curlRequest('https://openapi.baidu.com/rest/2.0/passport/users/getInfo?' . http_build_query([
            'access_token' => $accessToken,
            'get_unionid' => 1,
        ]));
        $uid = (string) ($info['unionid'] ?? ($info['userid'] ?? ''));
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取百度用户标识失败'];
        }
        $portrait = (string) ($info['portrait'] ?? '');
        if ($portrait !== '' && strpos($portrait, 'http') !== 0) {
            $portrait = 'https://tb.himg.baidu.com/sys/portraitn/item/' . $portrait;
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['username'] ?? '百度用户'),
            'faceimg' => $portrait,
            'gender' => (string) ($info['sex'] ?? ''),
            'location' => '',
            'access_token' => $accessToken,
        ];
    }

    private static function sinaProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://api.weibo.com/oauth2/access_token', [
            'client_id' => self::appId('sina'),
            'client_secret' => self::appKey('sina'),
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirect,
            'code' => $code,
        ]);
        $accessToken = (string) ($token['access_token'] ?? '');
        $uid = (string) ($token['uid'] ?? '');
        if ($accessToken === '' || $uid === '') {
            return ['code' => -1, 'msg' => '获取微博令牌失败'];
        }
        $info = self::curlRequest('https://api.weibo.com/2/users/show.json?' . http_build_query([
            'access_token' => $accessToken,
            'uid' => $uid,
        ]));
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['screen_name'] ?? '微博用户'),
            'faceimg' => (string) ($info['avatar_large'] ?? ($info['profile_image_url'] ?? '')),
            'gender' => (string) ($info['gender'] ?? ''),
            'location' => (string) ($info['location'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function dingtalkProfile(string $code): array
    {
        $token = self::curlRequest('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', [
            'clientId' => self::appId('dingtalk'),
            'clientSecret' => self::appKey('dingtalk'),
            'code' => $code,
            'grantType' => 'authorization_code',
        ], ['Content-Type: application/json'], true);
        $accessToken = (string) ($token['accessToken'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取钉钉令牌失败'];
        }
        $info = self::curlRequest('https://api.dingtalk.com/v1.0/contact/users/me', [], ['x-acs-dingtalk-access-token: ' . $accessToken]);
        $uid = (string) ($info['unionId'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取钉钉用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['nick'] ?? '钉钉用户'),
            'faceimg' => (string) ($info['avatarUrl'] ?? ''),
            'gender' => '',
            'location' => (string) ($info['stateCode'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function xiaomiProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://account.xiaomi.com/oauth2/token?' . http_build_query([
            'client_id' => self::appId('xiaomi'),
            'redirect_uri' => $redirect,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_secret' => self::appKey('xiaomi'),
        ]));
        $accessToken = (string) ($token['access_token'] ?? '');
        $openId = (string) ($token['openId'] ?? ($token['open_id'] ?? ''));
        if ($accessToken === '' || $openId === '') {
            return ['code' => -1, 'msg' => '获取小米令牌失败'];
        }
        $info = self::curlRequest('https://open.account.xiaomi.com/user/profile?' . http_build_query([
            'client_id' => self::appId('xiaomi'),
            'token' => $accessToken,
            'openId' => $openId,
        ]));
        if (is_array($info['data'] ?? null)) {
            $info = $info['data'];
        }
        $uid = (string) ($info['unionId'] ?? ($openId));
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['userName'] ?? '小米用户'),
            'faceimg' => (string) ($info['portraitUrl'] ?? ''),
            'gender' => '',
            'location' => '',
            'access_token' => $accessToken,
        ];
    }

    private static function huaweiProfile(string $code, string $redirect): array
    {
        $token = self::curlRequest('https://oauth-login.cloud.huawei.com/oauth2/v3/token', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => self::appId('huawei'),
            'client_secret' => self::appKey('huawei'),
            'redirect_uri' => $redirect,
        ]);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取华为令牌失败'];
        }
        $info = self::curlRequest('https://oauth-api.cloud.huawei.com/rest.php?' . http_build_query([
            'nsp_fmt' => 'JSON',
            'nsp_svc' => 'huawei.oauth2.user.getTokenInfo',
            'access_token' => $accessToken,
        ]));
        $uid = (string) ($info['open_id'] ?? '');
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取华为用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['display_name'] ?? '华为用户'),
            'faceimg' => (string) ($info['picture_url'] ?? ''),
            'gender' => '',
            'location' => '',
            'access_token' => $accessToken,
        ];
    }

    private static function customProfile(string $code, string $redirect): array
    {
        $tokenUrl = (string) pl_conf('oauth_puddingchat_token', '');
        $infoUrl = (string) pl_conf('oauth_puddingchat_userinfo', '');
        if ($tokenUrl === '' || $infoUrl === '') {
            return ['code' => -1, 'msg' => '自定义 OAuth 未配置令牌或用户信息地址'];
        }
        $token = self::curlRequest($tokenUrl, [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => self::appId('puddingchat'),
            'client_secret' => self::appKey('puddingchat'),
            'redirect_uri' => $redirect,
        ]);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return ['code' => -1, 'msg' => '获取自定义 OAuth 令牌失败'];
        }
        $info = self::curlRequest($infoUrl, [], ['Authorization: Bearer ' . $accessToken]);
        if (is_array($info['data'] ?? null)) {
            $info = $info['data'];
        }
        $uid = (string) ($info['sub'] ?? ($info['id'] ?? ($info['uid'] ?? ($info['openid'] ?? ''))));
        if ($uid === '') {
            return ['code' => -1, 'msg' => '获取自定义 OAuth 用户标识失败'];
        }
        return [
            'code' => 0,
            'social_uid' => $uid,
            'nickname' => (string) ($info['nickname'] ?? ($info['name'] ?? 'OAuth 用户')),
            'faceimg' => (string) ($info['avatar'] ?? ($info['picture'] ?? '')),
            'gender' => (string) ($info['gender'] ?? ''),
            'location' => (string) ($info['location'] ?? ''),
            'access_token' => $accessToken,
        ];
    }

    private static function alipaySign(array $params): string
    {
        ksort($params);
        $pairs = [];
        foreach ($params as $k => $v) {
            if ($v === '' || $v === null) {
                continue;
            }
            $pairs[] = $k . '=' . $v;
        }
        $content = implode('&', $pairs);
        $keyFile = PL_ROOT . '/storage/alipay_private.pem';
        if (!is_file($keyFile)) {
            return '';
        }
        $key = file_get_contents($keyFile);
        if ($key === false) {
            return '';
        }
        $sign = '';
        if (openssl_sign($content, $sign, $key, OPENSSL_ALGO_SHA256)) {
            return base64_encode($sign);
        }
        return '';
    }
}
