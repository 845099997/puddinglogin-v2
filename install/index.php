<?php
declare(strict_types=1);
/**
 * PuddingLogin - MIT License
 * 开源统一身份认证系统 · https://gitee.com/budingyun6/puddinglogin-v2
 */

session_start();

$root = dirname(__DIR__);
$lockFile = $root . '/storage/installed.lock';
$dbFile = $root . '/storage/database.php';
$sqlFile = __DIR__ . '/install.sql';

if (is_file($lockFile)) {
    render('already', []);
    exit;
}

$step = (int) ($_POST['step'] ?? $_GET['step'] ?? 1);
$errors = [];
$ok = null;

function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function render(string $view, array $data): void
{
    $step = $data['step'] ?? 1;
    $errors = $data['errors'] ?? [];
    $ok = $data['ok'] ?? null;
    $d = $data['data'] ?? [];
    ?><!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PuddingLogin 安装向导</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:linear-gradient(158deg,#ffffff 0%,#f8fafc 46%,#eef2f7 100%);color:#15202b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.wrap{width:100%;max-width:760px;background:#fff;border-radius:18px;box-shadow:0 20px 50px -34px rgba(15,23,42,.28);overflow:hidden;border:1px solid #e6ebf2}
.head{padding:26px 30px 18px;border-bottom:1px solid #eef2f7}
.head h1{margin:0;font-size:20px;letter-spacing:.2px}
.head p{margin:6px 0 0;font-size:13px;color:#64748b}
.steps{display:flex;gap:8px;padding:16px 30px 0;flex-wrap:wrap}
.chip{font-size:12px;padding:5px 11px;border-radius:999px;border:1px solid #e2e8f0;color:#94a3b8;background:#fff}
.chip.on{border-color:#ec7628;background:#fff4ea;color:#c2610f;font-weight:600}
.chip.done{border-color:#0f9b72;background:#ecfdf5;color:#0f7a5a}
.body{padding:22px 30px 30px}
.row{display:flex;gap:14px;flex-wrap:wrap}
.col{flex:1;min-width:220px}
label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px;color:#334155}
input,select{width:100%;padding:11px 13px;border:1px solid #dbe3ec;border-radius:12px;font-size:14px;outline:none;background:#fdfefe;color:#15202b;transition:.15s}
input:focus,select:focus{border-color:#ec7628;box-shadow:0 0 0 4px rgba(236,118,40,.12)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 26px;border:0;border-radius:12px;background:linear-gradient(135deg,#ffb27a 0%,#ff8f5a 46%,#fb84ab 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;transition:.15s}
.btn:hover{filter:brightness(1.05);transform:translateY(-1px)}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn.ghost{background:#fff;border:1px solid #dbe3ec;color:#475569;font-weight:600}
.actions{margin-top:24px;display:flex;gap:12px;align-items:center}
.err{background:#fef2f2;border:1px solid #fecaca;color:#b42318;padding:11px 14px;border-radius:12px;font-size:13px;margin-bottom:14px;line-height:1.7}
.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#0f7a5a;padding:11px 14px;border-radius:12px;font-size:13px;margin-bottom:14px}
ul.check{list-style:none;padding:0;margin:0}
ul.check li{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px dashed #eef2f7;font-size:13.5px}
ul.check li:last-child{border:0}
.t{font-weight:700}
.t.y{color:#0f7a5a}
.t.n{color:#b42318}
.tip{font-size:12.5px;color:#64748b;margin-top:10px;line-height:1.8}
code{background:#f1f5f9;padding:2px 6px;border-radius:6px;font-size:12.5px}
.done-icon{width:64px;height:64px;border-radius:50%;background:#ecfdf5;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;color:#0f9b72}
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <h1>PuddingLogin 安装向导</h1>
    <p>聚合登录与用户中心 · 五步完成部署</p>
  </div>
  <?php if ($view !== 'already'): ?>
  <div class="steps">
    <?php
    $labels = [1 => '环境检测', 2 => '数据库', 3 => '管理员', 4 => '站点信息', 5 => '完成'];
    foreach ($labels as $n => $text) {
        $cls = $n === $step ? 'on' : ($n < $step ? 'done' : '');
        echo '<span class="chip ' . $cls . '">' . $n . '. ' . $text . '</span>';
    }
    ?>
  </div>
  <?php endif; ?>
  <div class="body">
  <?php foreach ($errors as $msg): ?>
    <div class="err"><?= e($msg) ?></div>
  <?php endforeach; ?>
  <?php if ($ok): ?><div class="ok"><?= e($ok) ?></div><?php endif; ?>

  <?php if ($view === 'already'): ?>
    <div style="text-align:center;padding:20px 0">
      <div class="done-icon">✓</div>
      <h2 style="margin:0 0 8px;font-size:18px">系统已安装</h2>
      <p class="tip">检测到 <code>storage/installed.lock</code>，安装程序已锁定。<br>如需重装，请先手动删除该文件，并清空数据库后再访问本页面。</p>
      <div class="actions" style="justify-content:center">
        <a class="btn" href="../index.php">进入首页</a>
      </div>
    </div>

  <?php elseif ($view === 'env'): ?>
    <ul class="check">
      <?php foreach ($d['checks'] as $c): ?>
        <li>
          <span><?= e($c['name']) ?><?= $c['hint'] !== '' ? ' <span style="color:#94a3b8;font-size:12px">（' . e($c['hint']) . '）</span>' : '' ?></span>
          <span class="t <?= $c['ok'] ? 'y' : 'n' ?>" data-ok="<?= $c['ok'] ? '1' : '0' ?>"><?= $c['ok'] ? '通过' : '不通过' ?></span>
        </li>
      <?php endforeach; ?>
    </ul>
    <p class="tip">需要 PHP 7.4 及以上版本，并启用 PDO MySQL、mbstring 扩展；<code>storage/</code> 目录需可写。</p>
    <form method="post" action="">
      <input type="hidden" name="step" value="2">
      <div class="actions">
        <button class="btn" type="submit" <?= $d['all_ok'] ? '' : 'disabled' ?>>下一步：数据库配置</button>
      </div>
    </form>

  <?php elseif ($view === 'db'): ?>
    <form method="post" action="">
      <input type="hidden" name="step" value="3">
      <div class="row">
        <div class="col"><label>数据库地址</label><input name="db_host" value="<?= e($d['db_host'] ?? '127.0.0.1') ?>" required></div>
        <div class="col"><label>端口</label><input name="db_port" value="<?= e($d['db_port'] ?? '3306') ?>" required></div>
      </div>
      <div class="row">
        <div class="col"><label>数据库名</label><input name="db_name" value="<?= e($d['db_name'] ?? 'puddinglogin') ?>" required></div>
        <div class="col"><label>表前缀</label><input value="pl_" disabled></div>
      </div>
      <div class="row">
        <div class="col"><label>数据库用户名</label><input name="db_user" value="<?= e($d['db_user'] ?? '') ?>" required></div>
        <div class="col"><label>数据库密码</label><input name="db_pass" type="password" value="<?= e($d['db_pass'] ?? '') ?>" placeholder="留空表示无密码"></div>
      </div>
      <p class="tip">安装程序会自动创建数据库（若不存在）并导入全部表结构与初始数据。</p>
      <div class="actions">
        <a class="btn ghost" href="?step=1">上一步</a>
        <button class="btn" type="submit">下一步：管理员账号</button>
      </div>
    </form>

  <?php elseif ($view === 'admin'): ?>
    <form method="post" action="">
      <input type="hidden" name="step" value="4">
      <?php foreach (['db_host', 'db_port', 'db_name', 'db_user', 'db_pass'] as $k): ?>
        <input type="hidden" name="<?= $k ?>" value="<?= e($d[$k] ?? '') ?>">
      <?php endforeach; ?>
      <div class="row">
        <div class="col"><label>管理员账号</label><input name="admin_user" value="<?= e($d['admin_user'] ?? 'admin') ?>" required></div>
        <div class="col"><label>管理员昵称</label><input name="admin_nick" value="<?= e($d['admin_nick'] ?? '超级管理员') ?>"></div>
      </div>
      <div class="row">
        <div class="col"><label>管理员密码</label><input name="admin_pass" type="password" required placeholder="至少 6 位"></div>
        <div class="col"><label>确认密码</label><input name="admin_pass2" type="password" required></div>
      </div>
      <p class="tip">该账号将拥有后台全部管理权限，请务必记录并妥善保管。</p>
      <div class="actions">
        <a class="btn ghost" href="?step=2">上一步</a>
        <button class="btn" type="submit">下一步：站点信息</button>
      </div>
    </form>

  <?php elseif ($view === 'site'): ?>
    <form method="post" action="">
      <input type="hidden" name="step" value="5">
      <?php foreach (['db_host', 'db_port', 'db_name', 'db_user', 'db_pass', 'admin_user', 'admin_nick', 'admin_pass'] as $k): ?>
        <input type="hidden" name="<?= $k ?>" value="<?= e($d[$k] ?? '') ?>">
      <?php endforeach; ?>
      <div class="row">
        <div class="col"><label>站点名称</label><input name="sitename" value="<?= e($d['sitename'] ?? 'PuddingLogin') ?>" required></div>
        <div class="col"><label>客服 QQ</label><input name="kfqq" value="<?= e($d['kfqq'] ?? '') ?>"></div>
      </div>
      <label>站点地址</label>
      <input name="siteurl" value="<?= e($d['siteurl'] ?? '') ?>" placeholder="https://login.example.com" required>
      <label>备案号</label>
      <input name="site_icp" value="<?= e($d['site_icp'] ?? '') ?>" placeholder="粤ICP备xxxxxxxx号">
      <label>页脚版权</label>
      <input name="site_footer" value="<?= e($d['site_footer'] ?? '') ?>" placeholder="© 2025 你的公司 版权所有">
      <p class="tip">站点地址用于生成 OAuth 回调与接口地址，请填写完整协议与域名，例如 <code>https://login.example.com</code>。</p>
      <div class="actions">
        <a class="btn ghost" href="?step=3">上一步</a>
        <button class="btn" type="submit">开始安装</button>
      </div>
    </form>

  <?php elseif ($view === 'done'): ?>
    <div style="text-align:center;padding:14px 0">
      <div class="done-icon">✓</div>
      <h2 style="margin:0 0 10px;font-size:19px">安装完成</h2>
      <p class="tip">
        后台地址：<code><?= e($d['siteurl']) ?>/#/admin</code><br>
        管理员账号：<code><?= e($d['admin_user']) ?></code><br>
        请立即删除 <code>install/</code> 目录，避免安装程序被再次访问。
      </p>
      <div class="actions" style="justify-content:center">
        <a class="btn" href="../index.php">进入首页</a>
        <a class="btn ghost" href="../index.php#/admin">前往后台</a>
      </div>
    </div>
  <?php endif; ?>
  </div>
</div>
</body>
</html><?php
}

// ---------- 环境检测 ----------
function env_checks(string $root): array
{
    $storage = $root . '/storage';
    $checks = [];
    $checks[] = ['name' => 'PHP 版本', 'hint' => PHP_VERSION, 'ok' => version_compare(PHP_VERSION, '7.4.0', '>=')];
    $checks[] = ['name' => 'PDO MySQL 扩展', 'hint' => 'pdo_mysql', 'ok' => extension_loaded('pdo_mysql')];
    $checks[] = ['name' => 'mbstring 扩展', 'hint' => 'mbstring', 'ok' => extension_loaded('mbstring')];
    $checks[] = ['name' => 'cURL 扩展', 'hint' => 'curl', 'ok' => extension_loaded('curl')];
    $checks[] = ['name' => 'OpenSSL 扩展', 'hint' => 'openssl', 'ok' => extension_loaded('openssl')];
    $checks[] = ['name' => 'storage 目录', 'hint' => is_dir($storage) ? '存在' : '不存在', 'ok' => is_dir($storage)];
    $checks[] = ['name' => 'storage 可写', 'hint' => is_dir($storage) ? (is_writable($storage) ? '可写' : '不可写') : '不存在', 'ok' => is_dir($storage) && is_writable($storage)];
    $checks[] = ['name' => '安装 SQL 文件', 'hint' => is_file(__DIR__ . '/install.sql') ? 'install.sql' : '缺失', 'ok' => is_file(__DIR__ . '/install.sql')];
    return $checks;
}

// ---------- 入口分发 ----------
if ($step === 1) {
    $checks = env_checks($root);
    $allOk = true;
    foreach ($checks as $c) {
        if (!$c['ok']) {
            $allOk = false;
        }
    }
    render('env', ['step' => 1, 'data' => ['checks' => $checks, 'all_ok' => $allOk]]);
    exit;
}

if ($step === 2) {
    render('db', ['step' => 2, 'data' => []]);
    exit;
}

if ($step === 3) {
    $d = [
        'db_host' => trim((string) ($_POST['db_host'] ?? '127.0.0.1')),
        'db_port' => trim((string) ($_POST['db_port'] ?? '3306')),
        'db_name' => trim((string) ($_POST['db_name'] ?? '')),
        'db_user' => trim((string) ($_POST['db_user'] ?? '')),
        'db_pass' => (string) ($_POST['db_pass'] ?? ''),
    ];
    if ($d['db_host'] === '' || $d['db_name'] === '' || $d['db_user'] === '') {
        $errors[] = '数据库地址、库名与用户名不能为空';
    }
    if (!$errors) {
        try {
            $dsn = 'mysql:host=' . $d['db_host'] . ';port=' . $d['db_port'] . ';charset=utf8mb4';
            $pdo = new PDO($dsn, $d['db_user'], $d['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '', $d['db_name']) . '` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
            $ok = '数据库连接成功，库已就绪';
        } catch (Throwable $ex) {
            $errors[] = '数据库连接失败：' . $ex->getMessage();
        }
    }
    if ($errors) {
        render('db', ['step' => 2, 'errors' => $errors, 'data' => $d]);
        exit;
    }
    render('admin', ['step' => 3, 'ok' => $ok, 'data' => $d]);
    exit;
}

if ($step === 4) {
    $d = [];
    foreach (['db_host', 'db_port', 'db_name', 'db_user', 'db_pass', 'admin_user', 'admin_nick', 'admin_pass'] as $k) {
        $d[$k] = (string) ($_POST[$k] ?? '');
    }
    $pass2 = (string) ($_POST['admin_pass2'] ?? '');
    if ($d['admin_user'] === '') {
        $errors[] = '管理员账号不能为空';
    }
    if (mb_strlen($d['admin_pass']) < 6) {
        $errors[] = '管理员密码至少 6 位';
    }
    if ($d['admin_pass'] !== $pass2) {
        $errors[] = '两次输入的密码不一致';
    }
    if ($errors) {
        render('admin', ['step' => 3, 'errors' => $errors, 'data' => $d]);
        exit;
    }
    render('site', ['step' => 4, 'data' => $d]);
    exit;
}

if ($step === 5) {
    $d = [];
    foreach (['db_host', 'db_port', 'db_name', 'db_user', 'db_pass', 'admin_user', 'admin_nick', 'admin_pass', 'sitename', 'kfqq', 'siteurl', 'site_icp', 'site_footer'] as $k) {
        $d[$k] = (string) ($_POST[$k] ?? '');
    }
    if ($d['sitename'] === '' || $d['siteurl'] === '') {
        $errors[] = '站点名称与站点地址不能为空';
    }
    if (!$errors) {
        try {
            $dsn = 'mysql:host=' . $d['db_host'] . ';port=' . $d['db_port'] . ';dbname=' . $d['db_name'] . ';charset=utf8mb4';
            $pdo = new PDO($dsn, $d['db_user'], $d['db_pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);

            // 导入表结构与初始数据
            $sql = (string) file_get_contents($sqlFile);
            $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
            foreach (array_filter(array_map('trim', explode(";", $sql))) as $stmt) {
                if ($stmt !== '') {
                    $pdo->exec($stmt);
                }
            }

            // 创建管理员账号
            $hash = password_hash($d['admin_pass'], PASSWORD_DEFAULT);
            $now = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare('SELECT uid FROM pl_user WHERE username = ? LIMIT 1');
            $stmt->execute([$d['admin_user']]);
            $exist = $stmt->fetch();
            if ($exist) {
                $pdo->prepare('UPDATE pl_user SET pwd = ?, is_admin = 1, status = 1 WHERE uid = ?')->execute([$hash, (int) $exist['uid']]);
            } else {
                $pdo->prepare('INSERT INTO pl_user (username, pwd, nickname, gid, is_admin, status, addtime, lasttime, lastip) VALUES (?, ?, ?, 1, 1, 1, ?, ?, ?)')
                    ->execute([$d['admin_user'], $hash, $d['admin_nick'] !== '' ? $d['admin_nick'] : $d['admin_user'], $now, $now, $_SERVER['REMOTE_ADDR'] ?? '']);
            }

            // 写入站点配置
            $conf = [
                'sitename' => $d['sitename'],
                'title' => $d['sitename'] . ' · 聚合登录与用户中心',
                'siteurl' => rtrim($d['siteurl'], '/') . '/',
                'kfqq' => $d['kfqq'],
                'site_icp' => $d['site_icp'],
                'site_footer' => $d['site_footer'],
            ];
            $ins = $pdo->prepare('INSERT INTO pl_config (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
            foreach ($conf as $k => $v) {
                $ins->execute([$k, $v]);
            }

            // 写入数据库配置文件
            $sysKey = 'pl-' . bin2hex(random_bytes(8));
            $php = "<?php\nreturn [\n"
                . "    'host' => " . var_export($d['db_host'], true) . ",\n"
                . "    'port' => " . var_export($d['db_port'], true) . ",\n"
                . "    'name' => " . var_export($d['db_name'], true) . ",\n"
                . "    'user' => " . var_export($d['db_user'], true) . ",\n"
                . "    'pass' => " . var_export($d['db_pass'], true) . ",\n"
                . "    'sys_key' => " . var_export($sysKey, true) . ",\n"
                . "];\n";
            if (@file_put_contents($dbFile, $php) === false) {
                throw new RuntimeException('无法写入 storage/database.php，请检查 storage 目录权限');
            }
            @chmod($dbFile, 0640);

            // 写入安装锁
            $lockContent = 'installed at ' . $now . PHP_EOL . 'version ' . 'install' . PHP_EOL;
            if (@file_put_contents($lockFile, $lockContent) === false) {
                throw new RuntimeException('无法写入 storage/installed.lock，请检查 storage 目录权限');
            }
            @chmod($lockFile, 0644);

            render('done', ['step' => 5, 'data' => ['siteurl' => rtrim($d['siteurl'], '/'), 'admin_user' => $d['admin_user']]]);
            exit;
        } catch (Throwable $ex) {
            $errors[] = '安装失败：' . $ex->getMessage();
        }
    }
    render('site', ['step' => 4, 'errors' => $errors, 'data' => $d]);
    exit;
}

render('env', ['step' => 1, 'data' => ['checks' => env_checks($root), 'all_ok' => false]]);
