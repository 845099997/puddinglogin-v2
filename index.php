<?php
declare(strict_types=1);
// 安装检测：未完成安装时跳转安装向导
if (!is_file(__DIR__ . '/storage/installed.lock')) {
    header('Location: /install/index.php');
    exit;
}
require __DIR__ . '/app/core.php';

pl_session();

$site = pl_site_public();
$user = pl_current_user();
$boot = [
    'site' => $site,
    'csrf' => pl_csrf(),
    'user' => $user ? pl_user_public($user) : null,
    'base' => rtrim(pl_conf('siteurl', ''), '/'),
];

$title = (string) ($site['title'] ?: 'PuddingLogin');
$desc = (string) $site['description'];
$keywords = (string) $site['keywords'];
$hasBuild = is_file(__DIR__ . '/assets/app.js');

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
?><!DOCTYPE html>
<html lang="zh-CN" data-theme="day">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#FFF9F1">
<script>
(function(){
  try{
    var t = localStorage.getItem('pl_theme');
    if (t !== 'day' && t !== 'night') t = 'day';
    var r = document.documentElement;
    r.setAttribute('data-theme', t);
    r.style.colorScheme = t === 'day' ? 'light' : 'dark';
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'day' ? '#FFF9F1' : '#0A0B14');
  }catch(e){}
})();
</script>
<meta name="description" content="<?= htmlspecialchars($desc, ENT_QUOTES) ?>">
<meta name="keywords" content="<?= htmlspecialchars($keywords, ENT_QUOTES) ?>">
<title><?= htmlspecialchars($title, ENT_QUOTES) ?></title>
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<?php if ($hasBuild): ?>
<link rel="stylesheet" href="/assets/app.css?v=<?= PL_VERSION ?>">
<?php endif; ?>
<style>
  :root,html[data-theme='day']{--pl-boot-bg-a:#FFF9F1;--pl-boot-bg-b:#FFEEDA;--pl-boot-fg:#3A2415;--pl-boot-muted:#8A6A4B;}
  html[data-theme='night']{--pl-boot-bg-a:#0A0B14;--pl-boot-bg-b:#0E1020;--pl-boot-fg:#E7E9F5;--pl-boot-muted:#8A8FAB;}
  html,body{margin:0;padding:0;background:var(--pl-boot-bg-a);background-image:linear-gradient(158deg,var(--pl-boot-bg-a) 0%,var(--pl-boot-bg-b) 100%);color:var(--pl-boot-fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;}
  #root{min-height:100vh}
  .boot{display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:18px}
  .boot .dot{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#FFB86B,#FF6B9D 55%,#A78BFA);box-shadow:0 12px 40px rgba(255,107,157,.35);animation:pulse 1.4s ease-in-out infinite}
  @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.86);opacity:.6}}
</style>
</head>
<body>
<div id="root"><div class="boot"><div class="dot"></div><div style="color:var(--pl-boot-muted);font-size:14px">正在加载 PuddingLogin…</div></div></div>
<script>window.__PL_BOOT__ = <?= json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<?php if ($hasBuild): ?>
<script type="module" src="/assets/app.js?v=<?= PL_VERSION ?>"></script>
<?php else: ?>
<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:var(--pl-boot-muted);font-size:14px">前端资源尚未构建，请执行 npm run build</div>
<?php endif; ?>
</body>
</html>
