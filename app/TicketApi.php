<?php
declare(strict_types=1);

/**
 * 工单系统接口
 * 用户端：ticket.list / ticket.detail / ticket.create / ticket.reply / ticket.close
 * 管理端：admin.ticket.list / admin.ticket.detail / admin.ticket.reply / admin.ticket.status
 * 状态：0 待处理、1 处理中、2 已完成、3 已关闭
 */
final class TicketApi
{
    private const CATEGORIES = ['bug', 'account', 'billing', 'feature', 'other'];

    public static function dispatch(string $act): void
    {
        switch ($act) {
            case 'ticket.list':
                self::listMine();
                break;
            case 'ticket.detail':
                self::detail(false);
                break;
            case 'ticket.create':
                self::create();
                break;
            case 'ticket.reply':
                self::reply(false);
                break;
            case 'ticket.close':
                self::close();
                break;
            default:
                pl_err('未知的工单接口', -4, 404);
        }
    }

    public static function adminDispatch(string $act): void
    {
        switch ($act) {
            case 'admin.ticket.list':
                self::listAll();
                break;
            case 'admin.ticket.detail':
                self::detail(true);
                break;
            case 'admin.ticket.reply':
                self::reply(true);
                break;
            case 'admin.ticket.status':
                self::setStatus();
                break;
            default:
                pl_err('未知的工单管理接口', -4, 404);
        }
    }

    private static function method(string $expect): void
    {
        if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== $expect) {
            pl_err('请求方式错误', -4, 405);
        }
    }

    private static function paged(): array
    {
        $page = max(1, (int) pl_in('page', '1'));
        $size = min(50, max(1, (int) pl_in('size', '10')));
        return [$page, $size, ($page - 1) * $size];
    }

    private static function ticketPublic(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'uid' => (int) ($r['uid'] ?? 0),
            'title' => (string) $r['title'],
            'category' => (string) $r['category'],
            'status' => (int) $r['status'],
            'replycount' => (int) ($r['replycount'] ?? 0),
            'lastreply' => (string) ($r['lastreply'] ?? ''),
            'addtime' => (string) ($r['addtime'] ?? ''),
            'updatetime' => (string) ($r['updatetime'] ?? ''),
            'username' => (string) ($r['username'] ?? ''),
            'nickname' => (string) ($r['nickname'] ?? ''),
        ];
    }

    private static function listMine(): void
    {
        $u = pl_require_login();
        [$page, $size, $offset] = self::paged();
        $pdo = pl_pdo();
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM pl_ticket WHERE uid = ?');
        $cnt->execute([(int) $u['uid']]);
        $total = (int) $cnt->fetchColumn();
        $stmt = $pdo->prepare('SELECT id, uid, title, category, status, replycount, lastreply, addtime, updatetime FROM pl_ticket WHERE uid = ? ORDER BY (status IN (2,3)) ASC, id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute([(int) $u['uid']]);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = self::ticketPublic($r);
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    private static function listAll(): void
    {
        pl_require_admin();
        [$page, $size, $offset] = self::paged();
        $pdo = pl_pdo();
        $status = pl_in('status', '');
        $kw = trim(pl_in('kw'));
        $where = ' WHERE 1=1';
        $args = [];
        if (in_array($status, ['0', '1', '2', '3'], true)) {
            $where .= ' AND t.status = ?';
            $args[] = (int) $status;
        }
        if ($kw !== '') {
            $where .= ' AND (t.title LIKE ? OR t.content LIKE ? OR u.username LIKE ?)';
            $like = '%' . $kw . '%';
            $args[] = $like;
            $args[] = $like;
            $args[] = $like;
        }
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM pl_ticket t LEFT JOIN pl_user u ON u.uid = t.uid' . $where);
        $cnt->execute($args);
        $total = (int) $cnt->fetchColumn();
        $stmt = $pdo->prepare('SELECT t.id, t.uid, t.title, t.category, t.status, t.replycount, t.lastreply, t.addtime, t.updatetime, u.username, u.nickname FROM pl_ticket t LEFT JOIN pl_user u ON u.uid = t.uid' . $where . ' ORDER BY (t.status IN (0,1)) DESC, t.id DESC LIMIT ' . $offset . ', ' . $size);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $items[] = self::ticketPublic($r);
        }
        $stats = ['pending' => 0, 'doing' => 0, 'done' => 0, 'closed' => 0];
        try {
            foreach ($pdo->query('SELECT status, COUNT(*) AS c FROM pl_ticket GROUP BY status') as $r) {
                $s = (int) $r['status'];
                $key = $s === 0 ? 'pending' : ($s === 1 ? 'doing' : ($s === 2 ? 'done' : 'closed'));
                $stats[$key] = (int) $r['c'];
            }
        } catch (Throwable $e) {
        }
        pl_ok(['items' => $items, 'total' => $total, 'page' => $page, 'size' => $size, 'stats' => $stats]);
    }

    private static function detail(bool $admin): void
    {
        $u = $admin ? pl_require_admin() : pl_require_login();
        $id = (int) pl_in('id');
        if ($id <= 0) {
            pl_err('缺少工单编号');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT t.*, u.username, u.nickname FROM pl_ticket t LEFT JOIN pl_user u ON u.uid = t.uid WHERE t.id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('工单不存在');
        }
        if (!$admin && (int) $row['uid'] !== (int) $u['uid']) {
            pl_err('无权查看该工单', -1, 403);
        }
        $rs = $pdo->prepare('SELECT r.id, r.uid, r.role, r.content, r.addtime, u.username, u.nickname FROM pl_ticket_reply r LEFT JOIN pl_user u ON u.uid = r.uid WHERE r.tid = ? ORDER BY r.id ASC');
        $rs->execute([$id]);
        $replies = [];
        foreach ($rs->fetchAll() as $r) {
            $replies[] = [
                'id' => (int) $r['id'],
                'uid' => (int) $r['uid'],
                'role' => (string) $r['role'],
                'content' => (string) $r['content'],
                'addtime' => (string) ($r['addtime'] ?? ''),
                'username' => (string) ($r['username'] ?? ''),
                'nickname' => (string) ($r['nickname'] ?? ''),
            ];
        }
        $ticket = self::ticketPublic($row);
        $ticket['content'] = (string) ($row['content'] ?? '');
        pl_ok(['ticket' => $ticket, 'replies' => $replies]);
    }

    private static function create(): void
    {
        self::method('POST');
        $u = pl_require_login();
        pl_check_csrf();
        $title = trim(pl_in('title'));
        $content = trim(pl_in('content'));
        $category = pl_in('category', 'other');
        if (!in_array($category, self::CATEGORIES, true)) {
            $category = 'other';
        }
        if (mb_strlen($title) < 4) {
            pl_err('标题至少填写 4 个字');
        }
        if (mb_strlen($title) > 128) {
            pl_err('标题最多 128 个字');
        }
        if (mb_strlen($content) < 5) {
            pl_err('请具体描述问题（至少 5 个字）');
        }
        if (mb_strlen($content) > 5000) {
            pl_err('问题描述最多 5000 个字');
        }
        $pdo = pl_pdo();
        $open = $pdo->prepare('SELECT COUNT(*) FROM pl_ticket WHERE uid = ? AND status IN (0,1)');
        $open->execute([(int) $u['uid']]);
        if ((int) $open->fetchColumn() >= 5) {
            pl_err('您有 5 个未完成的工单，请等待处理完成后再提交新工单');
        }
        $now = pl_now();
        $pdo->prepare('INSERT INTO pl_ticket (uid, title, category, content, status, priority, admin_uid, replycount, lastreply, addtime, updatetime) VALUES (?, ?, ?, ?, 0, 1, 0, 0, ?, ?, ?)')
            ->execute([(int) $u['uid'], mb_substr($title, 0, 128), $category, mb_substr($content, 0, 5000), 'user', $now, $now]);
        $id = (int) $pdo->lastInsertId();
        pl_ok(['id' => $id], '工单已提交，我们会尽快处理');
    }

    private static function reply(bool $admin): void
    {
        self::method('POST');
        $u = $admin ? pl_require_admin() : pl_require_login();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $content = trim(pl_in('content'));
        if ($id <= 0) {
            pl_err('缺少工单编号');
        }
        if ($content === '') {
            pl_err('回复内容不能为空');
        }
        if (mb_strlen($content) > 5000) {
            pl_err('回复内容最多 5000 个字');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT * FROM pl_ticket WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('工单不存在');
        }
        if (!$admin && (int) $row['uid'] !== (int) $u['uid']) {
            pl_err('无权操作该工单', -1, 403);
        }
        if (!$admin && (int) $row['status'] === 3) {
            pl_err('工单已关闭，如需继续请新建工单');
        }
        $status = (int) $row['status'];
        if ($admin) {
            if ($status === 0 || $status === 3) {
                $status = 1;
            }
        } elseif ($status === 2) {
            $status = 1;
        }
        $now = pl_now();
        $pdo->prepare('INSERT INTO pl_ticket_reply (tid, uid, role, content, addtime) VALUES (?, ?, ?, ?, ?)')
            ->execute([$id, (int) $u['uid'], $admin ? 'admin' : 'user', mb_substr($content, 0, 5000), $now]);
        $rid = (int) $pdo->lastInsertId();
        $pdo->prepare('UPDATE pl_ticket SET replycount = replycount + 1, lastreply = ?, status = ?, admin_uid = ?, updatetime = ? WHERE id = ?')
            ->execute([$admin ? 'admin' : 'user', $status, $admin ? (int) $u['uid'] : (int) $row['admin_uid'], $now, $id]);
        pl_ok(['id' => $rid, 'status' => $status], '回复已提交');
    }

    private static function close(): void
    {
        self::method('POST');
        $u = pl_require_login();
        pl_check_csrf();
        $id = (int) pl_in('id');
        if ($id <= 0) {
            pl_err('缺少工单编号');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT * FROM pl_ticket WHERE id = ? AND uid = ? LIMIT 1');
        $stmt->execute([$id, (int) $u['uid']]);
        $row = $stmt->fetch();
        if (!$row) {
            pl_err('工单不存在', -1, 403);
        }
        if ((int) $row['status'] === 3) {
            pl_ok(['id' => $id, 'status' => 3], '工单已关闭');
        }
        $pdo->prepare('UPDATE pl_ticket SET status = 3, updatetime = ? WHERE id = ?')->execute([pl_now(), $id]);
        pl_ok(['id' => $id, 'status' => 3], '工单已关闭');
    }

    private static function setStatus(): void
    {
        self::method('POST');
        $admin = pl_require_admin();
        pl_check_csrf();
        $id = (int) pl_in('id');
        $status = (int) pl_in('status');
        if ($id <= 0) {
            pl_err('缺少工单编号');
        }
        if (!in_array($status, [1, 2, 3], true)) {
            pl_err('状态取值不合法');
        }
        $pdo = pl_pdo();
        $stmt = $pdo->prepare('SELECT id FROM pl_ticket WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            pl_err('工单不存在');
        }
        $pdo->prepare('UPDATE pl_ticket SET status = ?, admin_uid = ?, updatetime = ? WHERE id = ?')
            ->execute([$status, (int) $admin['uid'], pl_now(), $id]);
        $label = $status === 1 ? '处理中' : ($status === 2 ? '已完成' : '已关闭');
        pl_admin_log((int) $admin['uid'], 'ticket.status', '工单#' . $id . ' -> ' . $label);
        pl_ok(['id' => $id, 'status' => $status], '工单状态已更新为' . $label);
    }
}
