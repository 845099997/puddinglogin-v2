<?php
declare(strict_types=1);
require __DIR__ . '/app/core.php';

$site = pl_site_public();
$sitename = (string) ($site['sitename'] ?? 'PuddingLogin');
$version = (string) ($site['version'] ?? PL_VERSION);
// 优先使用后台配置的站点地址，未配置时按当前请求 Host 推导，避免写死某一域名
$base = pl_self_base();
$demoAppid = (string) pl_conf('default_appid', '');
$sdkTypes = [];
foreach (pl_platform_rows() as $r) {
    if ((int) $r['status'] === 1 && !empty($r['enabled'])) {
        $sdkTypes[] = $r;
    }
}
$h = static function (string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
};
$appidShown = $demoAppid !== '' ? $demoAppid : '你的AppID';
?>
<!DOCTYPE html>
<html lang='zh-CN'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>接入文档 · <?= $h($sitename) ?></title>
<?php $faviconPath = (string) ($site['favicon_path'] ?? '/favicon.ico'); ?>
<?php if ($faviconPath !== ''): ?>
<link rel='icon' href='<?= $h($faviconPath) ?>' />
<link rel='apple-touch-icon' href='<?= $h($logoPathForHead = (string) ($site['logo_path'] ?? '/logo.png')) ?>' />
<?php endif; ?>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0A0B14;color:#E7E9F5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.75}
a{color:#F6A07A;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:900px;margin:0 auto;padding:44px 22px 90px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:30px}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:40px;height:40px;border-radius:14px;background:linear-gradient(135deg,#F6A07A,#E86A6A);display:flex;align-items:center;justify-content:center;font-weight:700;color:#1B1420;object-fit:cover;overflow:hidden}
img.logo{background:transparent}
h1{font-size:23px;margin:0 0 5px}
.sub{color:#8A8FAB;font-size:13px;margin:0}
h2{font-size:18px;margin:36px 0 12px;padding-left:12px;border-left:3px solid #F6A07A}
h3{font-size:14px;margin:20px 0 8px;color:#E7E9F5}
p,li{font-size:14px;color:#B9BDD4}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:6px;color:#FFD9C7}
pre{background:#11131F;border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:16px 18px;overflow:auto;margin:12px 0}
pre code{background:none;padding:0;color:#CBD2F0;font-size:12.5px;line-height:1.7}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
th{color:#8A8FAB;font-weight:500;background:rgba(255,255,255,.02)}
.tag{display:inline-block;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:2px 8px;font-size:11.5px;color:#B9BDD4;margin:0 6px 6px 0}
.note{border-left:3px solid #6B7AE8;background:rgba(107,122,232,.09);padding:12px 16px;border-radius:0 12px 12px 0;font-size:13px;color:#B9BDD4;margin:14px 0}
.foot{margin-top:52px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);color:#5C6180;font-size:12px;text-align:center}
</style>
</head>
<body>
<div class='wrap'>
  <div class='top'>
    <div class='brand'>
      <?php $logoPath = (string) ($site['logo_path'] ?? '/logo.png'); ?>
      <?php if ($logoPath !== ''): ?>
      <img class='logo' src='<?= $h($logoPath) ?>' alt='<?= $h($sitename) ?>' />
      <?php else: ?>
      <div class='logo'><?= $h(mb_substr($sitename, 0, 1)) ?></div>
      <?php endif; ?>
      <div>
        <h1>接入文档</h1>
        <p class='sub'><?= $h($sitename) ?> · 聚合登录 OAuth 2.0 · v<?= $h($version) ?></p>
      </div>
    </div>
    <div><a href='<?= $h($base) ?>/'>← 返回站点</a></div>
  </div>

  <div class='note'>
    前端只引入 <code>sdk.js</code> 渲染登录按钮，授权完成后由<strong>服务端</strong>用 <code>code</code> 换取用户信息。<code>AppKey</code> 严禁出现在前端代码中。
  </div>

  <h2>1. 前置准备</h2>
  <p>在控制台「我的应用」创建应用后获得以下信息：</p>
  <table>
    <tr><th>字段</th><th>说明</th><th>保密级别</th></tr>
    <tr><td><code>AppID</code></td><td>应用唯一标识，可公开在前端使用</td><td>公开</td></tr>
    <tr><td><code>AppKey</code></td><td>应用密钥，仅允许服务端调用</td><td>绝密</td></tr>
    <tr><td>授权回调域名</td><td>填写后启用域名白名单校验，同时解锁免密钥 SDK 登录</td><td>公开</td></tr>
    <tr><td>可用登录方式</td><td>只有勾选的平台对该应用开放，未勾选会被拒绝</td><td>公开</td></tr>
  </table>
  <p>本站当前已开启的登录方式：</p>
  <div>
    <?php if ($sdkTypes === []): ?>
      <span class='tag'>暂无已开启的登录方式</span>
    <?php else: ?>
      <?php foreach ($sdkTypes as $t): ?>
        <span class='tag'><?= $h((string) $t['name']) ?> · <?= $h((string) $t['type']) ?></span>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>

  <h2>2. 前端一键登录（SDK）</h2>
  <h3>2.1 引入 SDK 并渲染按钮</h3>
  <pre><code>&lt;script src='<?= $h($base) ?>/sdk.js'&gt;&lt;/script&gt;

&lt;div id='pl-login'&gt;&lt;/div&gt;

&lt;script&gt;
  PlLogin.init({
    appid: '<?= $h($appidShown) ?>',
    redirect_uri: 'https://your-site.com/callback',
    theme: 'auto',
    onError: function (msg) { console.warn(msg); }
  }).mount('#pl-login');
&lt;/script&gt;</code></pre>
  <p><code>mount()</code> 会自动向 <code>connect.php?act=sdk</code> 拉取该应用可用的登录方式并渲染按钮，点击后直接跳转对应平台授权页，前端无需持有 AppKey。</p>

  <h3>2.2 回调页解析授权结果</h3>
  <p>授权完成后浏览器回到你配置的 <code>redirect_uri</code>，地址形如：</p>
  <pre><code>https://your-site.com/callback?type=qq&amp;code=7c1f0a9e2b4d6f8a1c3e5b7d&amp;state=xxx</code></pre>
  <pre><code>var r = PlLogin.callback();
if (r) {
  // r = { type: 'qq', code: '...', state: '...' }
  fetch('/your-server/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: r.type, code: r.code })
  });
}</code></pre>
  <div class='note'><code>code</code> 有效期 5 分钟且只能使用一次，请立即交给服务端处理。</div>

  <h2>3. 服务端换取用户信息</h2>
  <table>
    <tr><th>项目</th><th>值</th></tr>
    <tr><td>请求方式</td><td><code>GET</code></td></tr>
    <tr><td>请求地址</td><td><code><?= $h($base) ?>/connect.php</code></td></tr>
    <tr><td>参数</td><td><code>act=callback</code>、<code>appid</code>、<code>appkey</code>、<code>code</code></td></tr>
  </table>
  <pre><code>&lt;?php
$url = '<?= $h($base) ?>/connect.php?' . http_build_query([
    'act'    =&gt; 'callback',
    'appid'  =&gt; '<?= $h($appidShown) ?>',
    'appkey' =&gt; '你的AppKey',
    'code'   =&gt; $_GET['code'],
]);
$resp = json_decode(file_get_contents($url), true);

if (($resp['code'] ?? -1) === 0) {
    $socialUid = $resp['social_uid'];
    $nickname  = $resp['nickname'];
    $avatar    = $resp['faceimg'];
    $type      = $resp['type'];
} else {
    exit('登录失败：' . ($resp['msg'] ?? '未知错误'));
}</code></pre>
  <p>成功返回示例：</p>
  <pre><code>{
  'code': 0,
  'type': 'qq',
  'social_uid': '9C3F...',
  'nickname': '布丁用户',
  'faceimg': 'https://.../avatar.png',
  'ip': '1.2.3.4'
}</code></pre>

  <h2>4. 服务端发起登录（可选）</h2>
  <p>不使用前端 SDK、由后端生成跳转链接时使用带密钥接口：</p>
  <pre><code>GET <?= $h($base) ?>/connect.php?act=login
    &amp;appid=<?= $h($appidShown) ?>
    &amp;appkey=你的AppKey
    &amp;type=qq
    &amp;redirect_uri=https%3A%2F%2Fyour-site.com%2Fcallback
    &amp;state=自定义随机串</code></pre>
  <p>返回 <code>{'code':0,'type':'qq','url':'https://...','state':'...'}</code>，把用户浏览器重定向到 <code>url</code> 即可，<code>state</code> 会原样带回，务必校验。</p>

  <h2>5. 免密钥接口 act=sdk</h2>
  <table>
    <tr><th>用途</th><th>请求</th></tr>
    <tr><td>获取可用登录方式</td><td><code>GET /connect.php?act=sdk&amp;appid=AppID&amp;redirect_uri=回调地址</code></td></tr>
    <tr><td>获取指定方式授权地址</td><td><code>GET /connect.php?act=sdk&amp;appid=AppID&amp;type=qq&amp;redirect_uri=回调地址&amp;state=随机串</code></td></tr>
  </table>
  <p>前提：应用已填写回调域名白名单且与 <code>redirect_uri</code> 完全一致，否则返回 103。该接口不需要 AppKey，可安全用于纯前端。</p>

  <h2>6. 查询已绑定用户（可选）</h2>
  <pre><code>GET <?= $h($base) ?>/connect.php?act=query
    &amp;appid=<?= $h($appidShown) ?>
    &amp;appkey=你的AppKey
    &amp;type=qq
    &amp;social_uid=平台唯一标识</code></pre>
  <p>返回该社交账号昵称、头像等资料，未找到时 <code>code=2</code>。</p>

  <h2>7. 错误码</h2>
  <table>
    <tr><th>errcode</th><th>含义</th><th>处理建议</th></tr>
    <tr><td><code>101</code></td><td>缺少必要参数（appid / appkey / redirect_uri / code）</td><td>检查参数是否完整</td></tr>
    <tr><td><code>102</code></td><td>应用不存在或已关闭</td><td>核对 AppID 与应用状态</td></tr>
    <tr><td><code>103</code></td><td>AppKey 错误、回调域名未授权、该应用未开放此登录方式、该登录方式无法使用</td><td>按返回 msg 逐项排查</td></tr>
  </table>
  <p>换取接口的业务结果用 <code>code</code> 表示：<code>0</code> 成功；<code>2</code> 授权码不存在 / 已使用 / 已过期。</p>

  <h2>8. 最小可用示例</h2>
  <pre><code>&lt;!-- 登录页 --&gt;
&lt;script src='<?= $h($base) ?>/sdk.js'&gt;&lt;/script&gt;
&lt;div id='pl-login'&gt;&lt;/div&gt;
&lt;script&gt;
  PlLogin.init({
    appid: '<?= $h($appidShown) ?>',
    redirect_uri: 'https://your-site.com/callback'
  }).mount('#pl-login');
&lt;/script&gt;

&lt;!-- 回调页 --&gt;
&lt;script src='<?= $h($base) ?>/sdk.js'&gt;&lt;/script&gt;
&lt;script&gt;
  var r = PlLogin.callback();
  if (!r) { location.href = '/'; }
  else {
    fetch('/api/login-by-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r)
    }).then(function (x) { return x.json(); })
      .then(function (d) { location.href = d.ok ? '/dashboard' : '/?error=login'; });
  }
&lt;/script&gt;</code></pre>

  <div class='foot'><?= $h($sitename) ?> © <?= date('Y') ?> · 文档版本 v<?= $h($version) ?> · <a href='<?= $h($base) ?>/'>返回站点</a></div>
</div>
</body>
</html>
