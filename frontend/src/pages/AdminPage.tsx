import { useCallback, useEffect, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';
import { get, logLabel, post, type Site, type User } from '../lib/api';
import { cx, Field, Modal, Spinner, useToast } from '../lib/ui';
import PlatformPage from './PlatformPage';
import SystemSettingsPage from './SystemSettingsPage';
import AdminGroupsPage from './AdminGroupsPage';
import AdminGroupBuyPage from './AdminGroupBuyPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminAccountsPage from './AdminAccountsPage';
import AdminLoginLogsPage from './AdminLoginLogsPage';
import AdminTicketsPage from './AdminTicketsPage';

type Stats = {
  users: number;
  users_today: number;
  admins: number;
  disabled: number;
  apps: number;
  accounts: number;
  logs: number;
  logs_today: number;
};

type AdminUser = {
  uid: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  status: number;
  is_admin: number;
  addtime: string;
  lasttime: string;
  lastip: string;
  bound: { qq: boolean; wx: boolean; alipay: boolean };
};

type AdminApp = {
  id: number;
  appid: string;
  appkey: string;
  name: string;
  type: string;
  status: number;
  owner: string;
  uid: number;
  addtime: string;
  domains: string[];
};

type AdminLog = {
  id: number;
  uid: number;
  username: string;
  action: string;
  detail: string;
  target: string;
  date: string;
  ip: string;
};

type UserLog = { username: string; type: string; date: string; ip: string };

type Paged<T> = { items: T[]; total: number; page: number; size: number };

type Tab = 'overview' | 'platform' | 'system' | 'users' | 'groups' | 'groupbuy' | 'orders' | 'accounts' | 'loginlogs' | 'tickets' | 'apps' | 'logs';

const TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'overview', label: '概览', icon: 'chart' },
  { key: 'platform', label: '登录接口', icon: 'link' },
  { key: 'system', label: '系统设置', icon: 'shield' },
  { key: 'users', label: '用户管理', icon: 'user' },
  { key: 'groups', label: '用户组设置', icon: 'accounts' },
  { key: 'groupbuy', label: '用户组购买', icon: 'chart' },
  { key: 'orders', label: '支付订单', icon: 'logs' },
  { key: 'accounts', label: '第三方账号', icon: 'user' },
  { key: 'loginlogs', label: '登录记录', icon: 'profile' },
  { key: 'tickets', label: '工单管理', icon: 'mail' },
  { key: 'apps', label: '应用管理', icon: 'apps' },
  { key: 'logs', label: '审计日志', icon: 'logs' },
];

function inputCls(mono?: boolean) {
  return cx(
    'w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8',
    mono && 'font-mono text-xs'
  );
}

export default function AdminPage({
  site,
  user,
  onGo,
  onUser,
}: {
  site: Site;
  user: User;
  onGo: (p: string) => void;
  onUser: (u: User | null) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [users, setUsers] = useState<Paged<AdminUser> | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userKw, setUserKw] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<AdminUser | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const [selfPwdOpen, setSelfPwdOpen] = useState(false);
  const [oldSelfPwd, setOldSelfPwd] = useState('');
  const [newSelfPwd, setNewSelfPwd] = useState('');
  const [newSelfPwd2, setNewSelfPwd2] = useState('');
  const [selfPwdBusy, setSelfPwdBusy] = useState(false);

  const [apps, setApps] = useState<Paged<AdminApp> | null>(null);
  const [appPage, setAppPage] = useState(1);
  const [appKw, setAppKw] = useState('');
  const [appsLoading, setAppsLoading] = useState(false);
  const [delApp, setDelApp] = useState<AdminApp | null>(null);
  const [appBusy, setAppBusy] = useState(false);

  const [logs, setLogs] = useState<Paged<AdminLog> | null>(null);
  const [logPage, setLogPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [userLogs, setUserLogs] = useState<Paged<UserLog> | null>(null);
  const [userLogPage, setUserLogPage] = useState(1);
  const [logMode, setLogMode] = useState<'admin' | 'user'>('admin');

  const [groups, setGroups] = useState<Array<{ gid: number; name: string; ucount: number; info: string }>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editNick, setEditNick] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGid, setEditGid] = useState(0);
  const [editMoney, setEditMoney] = useState('');
  const [editUserBusy, setEditUserBusy] = useState(false);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    get<{ stats: Stats }>('admin.stats').then((res) => {
      if (res.code === 0 && res.data) setStats(res.data.stats);
      setStatsLoading(false);
    });
  }, []);

  const loadUsers = useCallback(
    (p: number, kw: string) => {
      setUsersLoading(true);
      const params: Record<string, string | number> = { page: p };
      if (kw.trim() !== '') params.kw = kw.trim();
      get<Paged<AdminUser>>('admin.users', params).then((res) => {
        if (res.code === 0 && res.data) setUsers(res.data);
        else toast.push('error', res.msg || '加载用户失败');
        setUsersLoading(false);
      });
    },
    [toast]
  );

  const loadApps = useCallback(
    (p: number, kw: string) => {
      setAppsLoading(true);
      const params: Record<string, string | number> = { page: p };
      if (kw.trim() !== '') params.kw = kw.trim();
      get<Paged<AdminApp>>('admin.apps', params).then((res) => {
        if (res.code === 0 && res.data) setApps(res.data);
        else toast.push('error', res.msg || '加载应用失败');
        setAppsLoading(false);
      });
    },
    [toast]
  );

  const loadLogs = useCallback(
    (p: number, mode: 'admin' | 'user') => {
      setLogsLoading(true);
      if (mode === 'admin') {
        get<Paged<AdminLog>>('admin.logs', { page: p }).then((res) => {
          if (res.code === 0 && res.data) setLogs(res.data);
          else toast.push('error', res.msg || '加载日志失败');
          setLogsLoading(false);
        });
      } else {
        get<Paged<UserLog>>('admin.userlogs', { page: p }).then((res) => {
          if (res.code === 0 && res.data) setUserLogs(res.data);
          else toast.push('error', res.msg || '加载日志失败');
          setLogsLoading(false);
        });
      }
    },
    [toast]
  );

  const loadGroups = useCallback(() => {
    setGroupsLoading(true);
    get<{ items: Array<{ gid: number; name: string; ucount: number; info: string }> }>('admin.groups').then((res) => {
      if (res.code === 0 && res.data) setGroups(res.data.items);
      else toast.push('error', res.msg || '加载用户组失败');
      setGroupsLoading(false);
    });
  }, [toast]);

  useEffect(() => {
    if (tab === 'overview') loadStats();
    if (tab === 'users') loadUsers(userPage, userKw);
    if (tab === 'groups') loadGroups();
    if (tab === 'apps') loadApps(appPage, appKw);
    if (tab === 'logs') loadLogs(logMode === 'admin' ? logPage : userLogPage, logMode);
  }, [tab, userPage, userKw, appPage, appKw, logPage, userLogPage, logMode, loadStats, loadUsers, loadGroups, loadApps, loadLogs]);

  const toggleUser = async (u: AdminUser, field: 'status' | 'is_admin') => {
    const nextVal = field === 'status' ? (u.status === 1 ? 0 : 1) : u.is_admin === 1 ? 0 : 1;
    const body: Record<string, string | number> = { uid: u.uid };
    body[field] = nextVal;
    const res = await post('admin.user.save', body);
    if (res.code === 0) {
      toast.push('success', res.msg || '已更新');
      loadUsers(userPage, userKw);
    } else {
      toast.push('error', res.msg || '操作失败');
    }
  };

  const submitPwd = async () => {
    if (!pwdTarget || pwdBusy) return;
    if (newPwd.length < 6) {
      toast.push('error', '密码至少 6 位');
      return;
    }
    setPwdBusy(true);
    const res = await post('admin.user.pwd', { uid: pwdTarget.uid, password: newPwd });
    setPwdBusy(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '密码已重置');
      setPwdTarget(null);
      setNewPwd('');
    } else {
      toast.push('error', res.msg || '重置失败');
    }
  };

  const toggleApp = async (a: AdminApp) => {
    const res = await post('admin.app.toggle', { id: a.id });
    if (res.code === 0) {
      toast.push('success', res.msg || '已更新');
      loadApps(appPage, appKw);
    } else {
      toast.push('error', res.msg || '操作失败');
    }
  };

  const submitDelApp = async () => {
    if (!delApp || appBusy) return;
    setAppBusy(true);
    const res = await post('admin.app.delete', { id: delApp.id });
    setAppBusy(false);
    setDelApp(null);
    if (res.code === 0) {
      toast.push('success', res.msg || '应用已删除');
      loadApps(appPage, appKw);
    } else {
      toast.push('error', res.msg || '删除失败');
    }
  };

  const openEditUser = (u: AdminUser) => {
    setEditUser(u);
    setEditNick(u.nickname || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditGid(u.gid ?? 0);
    setEditMoney(String(u.money ?? '0.00'));
  };

  const submitEditUser = async () => {
    if (!editUser || editUserBusy) return;
    setEditUserBusy(true);
    const body: Record<string, string | number> = { uid: editUser.uid };
    body.nickname = editNick;
    body.email = editEmail;
    body.phone = editPhone;
    body.gid = editGid;
    body.money = parseFloat(editMoney) || 0;
    const res = await post('admin.user.save', body);
    setEditUserBusy(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '已更新');
      setEditUser(null);
      loadUsers(userPage, userKw);
    } else { toast.push('error', res.msg || '保存失败'); }
  };

  const logout = async () => {
    const res = await post('logout');
    if (res.code === 0) {
      onUser(null);
      onGo('login');
      toast.push('success', '已安全退出');
    } else {
      toast.push('error', res.msg || '退出失败');
    }
  };

  async function changeSelfPwd() {
    if (selfPwdBusy) return;
    if (oldSelfPwd === '' || newSelfPwd === '' || newSelfPwd2 === '') {
      toast.push('error', '请填写完整信息');
      return;
    }
    if (newSelfPwd !== newSelfPwd2) {
      toast.push('error', '两次输入的新密码不一致');
      return;
    }
    if (newSelfPwd.length < 6) {
      toast.push('error', '新密码至少 6 位');
      return;
    }
    setSelfPwdBusy(true);
    const res = await post('admin.self.pwd', { old_password: oldSelfPwd, new_password: newSelfPwd, new_password2: newSelfPwd2 });
    setSelfPwdBusy(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '密码修改成功');
      setSelfPwdOpen(false);
      setOldSelfPwd('');
      setNewSelfPwd('');
      setNewSelfPwd2('');
    } else {
      toast.push('error', res.msg || '修改失败');
    }
  }

  const initial = (user.nickname || user.username || 'A').slice(0, 1).toUpperCase();

  const statCards: Array<{ k: keyof Stats; label: string; icon: IconName; tone: string }> = [
    { k: 'users', label: '注册用户', icon: 'user', tone: 'text-pudding-300' },
    { k: 'apps', label: '应用总数', icon: 'apps', tone: 'text-berry-300' },
    { k: 'accounts', label: '授权账号', icon: 'accounts', tone: 'text-lilac-300' },
    { k: 'logs', label: '操作记录', icon: 'logs', tone: 'text-mint' },
  ];

  return (
    <div className='min-h-screen bg-ink-900'>
      <header className='sticky top-0 z-40 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl'>
        <div className='mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6'>
          <div className='flex min-w-0 items-center gap-3'>
            <button
              type='button'
              onClick={() => setMenuOpen((v) => !v)}
              className='rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 lg:hidden'
              aria-label='菜单'
            >
              <Icon name='menu' size={18} />
            </button>
            <img src={site.logo_path || '/logo.png'} alt={site.sitename} className='h-9 w-9 rounded-xl object-contain' />
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold text-cream'>管理后台</p>
              <p className='truncate text-[11px] text-white/40'>{site.sitename} · v{site.version}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>

            <div className='flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3'>
              <div className='flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-ink-800 text-[11px] font-semibold text-cream'>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.nickname} className='h-full w-full object-cover' referrerPolicy='no-referrer' />
                ) : (
                  initial
                )}
              </div>
              <span className='hidden text-xs font-medium text-cream/85 sm:block'>{user.nickname || user.username}</span>
            </div>
            <ThemeToggle />
            <button
              type='button'
              onClick={() => setSelfPwdOpen(true)}
              className='rounded-xl border border-white/10 bg-white/5 p-2 text-white/55 transition hover:bg-white/10 hover:text-white/80'
              aria-label='修改密码'
            >
              <Icon name='lock' size={16} />
            </button>
            <button
              type='button'
              onClick={logout}
              className='rounded-xl border border-white/10 bg-white/5 p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-200'
              aria-label='退出登录'
            >
              <Icon name='logout' size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className='mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6'>
        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-50 w-[240px] shrink-0 border-r border-white/8 bg-ink-950/95 px-3 py-4 backdrop-blur-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:rounded-3xl lg:border lg:bg-ink-850/80 lg:py-5',
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <p className='px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/30'>Admin</p>
          <nav className='space-y-1'>
            {TABS.map((t) => (
              <button
                key={t.key}
                type='button'
                onClick={() => {
                  setTab(t.key);
                  setMenuOpen(false);
                }}
                className={cx(
                  'flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition',
                  tab === t.key
                    ? 'border border-white/12 bg-white/10 font-medium text-cream'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/85'
                )}
              >
                <Icon name={t.icon} size={17} />
                {t.label}
              </button>
            ))}
          </nav>

        </aside>

        {menuOpen ? (
          <div className='fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden' onClick={() => setMenuOpen(false)} aria-hidden='true' />
        ) : null}

        <main className='min-w-0 flex-1 space-y-6'>
          {tab === 'overview' ? (
            <>
              <section className='rounded-3xl border border-white/10 bg-mesh p-6 shadow-card'>
                <p className='text-xs font-medium uppercase tracking-[0.2em] text-white/40'>Dashboard</p>
                <h1 className='mt-2 text-2xl font-semibold text-cream'>欢迎回来，{user.nickname || user.username}</h1>
                <p className='mt-2 text-sm text-white/50'>这里可以管理站点配置、用户账号、全部应用与审计日志。</p>
              </section>
              <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                {statCards.map((c) => (
                  <div key={c.k} className='rounded-3xl border border-white/10 bg-ink-850/80 p-5 shadow-soft'>
                    <div className={cx('inline-flex rounded-2xl border border-white/10 bg-white/5 p-2.5', c.tone)}>
                      <Icon name={c.icon} size={20} />
                    </div>
                    <p className='mt-4 text-3xl font-semibold tracking-tight text-cream'>
                      {statsLoading || !stats ? <span className='text-white/25'>--</span> : stats[c.k]}
                    </p>
                    <p className='mt-1 text-sm text-white/50'>{c.label}</p>
                  </div>
                ))}
              </section>
              <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                {[
                  { label: '今日新增', v: stats?.users_today, icon: 'sparkle' as IconName },
                  { label: '管理员', v: stats?.admins, icon: 'shield' as IconName },
                  { label: '已封禁', v: stats?.disabled, icon: 'eye-off' as IconName },
                  { label: '今日操作', v: stats?.logs_today, icon: 'chart' as IconName },
                ].map((r) => (
                  <div key={r.label} className='flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3'>
                    <span className='flex items-center gap-2 text-xs text-white/45'>
                      <Icon name={r.icon} size={14} />
                      {r.label}
                    </span>
                    <span className='text-sm font-semibold text-cream/90'>{statsLoading || r.v === undefined ? '--' : r.v}</span>
                  </div>
                ))}
              </section>
            </>
          ) : null}

          {tab === 'platform' ? <PlatformPage site={site} /> : null}
          {tab === 'system' ? <SystemSettingsPage /> : null}
          {tab === 'users' ? (
            <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
              <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h1 className='text-lg font-semibold text-cream'>用户管理</h1>
                  <p className='mt-1 text-xs text-white/40'>共 {users?.total ?? 0} 位用户</p>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='relative w-full sm:w-64'>
                    <div className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30'>
                      <Icon name='search' size={14} />
                    </div>
                    <input
                      value={userKw}
                      onChange={(e) => setUserKw(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setUserPage(1);
                          loadUsers(1, userKw);
                        }
                      }}
                      placeholder='搜索用户名/昵称/邮箱'
                      className='w-full rounded-xl border border-white/12 bg-white/5 py-2 pl-9 pr-3 text-xs text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={() => {
                      setUserPage(1);
                      loadUsers(1, userKw);
                    }}
                    className='rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white'
                  >
                    搜索
                  </button>
                </div>
              </div>
              {usersLoading ? (
                <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
                  <Spinner size={18} />
                  正在加载…
                </div>
              ) : (users?.items.length ?? 0) === 0 ? (
                <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
                  <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
                    <Icon name='user' size={22} />
                  </div>
                  <p className='text-sm text-white/35'>没有匹配的用户</p>
                </div>
              ) : (
                <ul className='divide-y divide-white/8'>
                  {users?.items.map((u) => (
                    <li key={u.uid} className='flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center'>
                      <div className='flex min-w-0 flex-1 items-center gap-3'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-cream'>
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.nickname} className='h-full w-full object-cover' referrerPolicy='no-referrer' />
                          ) : (
                            (u.nickname || u.username).slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            <span className='truncate text-sm font-medium text-cream/90'>{u.nickname || u.username}</span>
                            {u.is_admin === 1 ? (
                              <span className='rounded-full border border-pudding-300/35 bg-pudding-400/12 px-2 py-0.5 text-[10px] text-pudding-300'>管理员</span>
                            ) : null}
                            <span
                              className={cx(
                                'rounded-full border px-2 py-0.5 text-[10px]',
                                u.status === 1
                                  ? 'border-mint/30 bg-mint/10 text-mint'
                                  : 'border-red-400/30 bg-red-500/10 text-red-300'
                              )}
                            >
                              {u.status === 1 ? '正常' : '已封禁'}
                            </span>
                          </div>
                          <p className='mt-0.5 truncate text-[11px] text-white/35'>
                            @{u.username} · UID {u.uid} · 注册 {u.addtime || '-'}
                          </p>
                        </div>
                      </div>
                      <div className='flex shrink-0 flex-wrap items-center gap-1.5'>
                        <button
                          type='button'
                          onClick={() => openEditUser(u)}
                          className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition hover:bg-white/10 hover:text-white'
                        >
                          编辑
                        </button>
                        <button
                          type='button'
                          onClick={() => setPwdTarget(u)}
                          className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition hover:bg-white/10 hover:text-white'
                        >
                          重置密码
                        </button>
                        <button
                          type='button'
                          onClick={() => toggleUser(u, 'is_admin')}
                          className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition hover:bg-white/10 hover:text-white'
                        >
                          {u.is_admin === 1 ? '取消管理员' : '设为管理员'}
                        </button>
                        <button
                          type='button'
                          onClick={() => toggleUser(u, 'status')}
                          className={cx(
                            'rounded-xl border px-3 py-1.5 text-[11px] transition',
                            u.status === 1
                              ? 'border-red-400/25 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                              : 'border-mint/30 bg-mint/10 text-mint hover:bg-mint/20'
                          )}
                        >
                          {u.status === 1 ? '封禁' : '启用'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className='flex items-center justify-between border-t border-white/8 bg-ink-900/50 px-6 py-4'>
                <button
                  type='button'
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage <= 1 || usersLoading}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40'
                >
                  <Icon name='arrow-left' size={13} />
                  上一页
                </button>
                <span className='text-xs text-white/35'>
                  {userPage} / {Math.max(1, Math.ceil((users?.total ?? 0) / (users?.size ?? 20)))}
                </span>
                <button
                  type='button'
                  onClick={() => setUserPage((p) => p + 1)}
                  disabled={usersLoading || userPage >= Math.max(1, Math.ceil((users?.total ?? 0) / (users?.size ?? 20)))}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40'
                >
                  下一页
                  <Icon name='arrow-right' size={13} />
                </button>
              </div>
            </section>
          ) : null}

          {tab === 'groups' ? <AdminGroupsPage types={site.types} /> : null}
          {tab === 'groupbuy' ? <AdminGroupBuyPage /> : null}
          {tab === 'orders' ? <AdminOrdersPage /> : null}
          {tab === 'accounts' ? <AdminAccountsPage types={site.types} /> : null}
          {tab === 'loginlogs' ? <AdminLoginLogsPage types={site.types} /> : null}
          {tab === 'tickets' ? <AdminTicketsPage /> : null}
          {tab === 'apps' ? (
            <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
              <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h1 className='text-lg font-semibold text-cream'>应用管理</h1>
                  <p className='mt-1 text-xs text-white/40'>共 {apps?.total ?? 0} 个应用 · 密钥已掩码显示</p>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='relative w-full sm:w-64'>
                    <div className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30'>
                      <Icon name='search' size={14} />
                    </div>
                    <input
                      value={appKw}
                      onChange={(e) => setAppKw(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setAppPage(1);
                          loadApps(1, appKw);
                        }
                      }}
                      placeholder='搜索应用名/AppID'
                      className='w-full rounded-xl border border-white/12 bg-white/5 py-2 pl-9 pr-3 text-xs text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={() => {
                      setAppPage(1);
                      loadApps(1, appKw);
                    }}
                    className='rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white'
                  >
                    搜索
                  </button>
                </div>
              </div>
              {appsLoading ? (
                <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
                  <Spinner size={18} />
                  正在加载…
                </div>
              ) : (apps?.items.length ?? 0) === 0 ? (
                <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
                  <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
                    <Icon name='apps' size={22} />
                  </div>
                  <p className='text-sm text-white/35'>暂无应用</p>
                </div>
              ) : (
                <ul className='divide-y divide-white/8'>
                  {apps?.items.map((a) => (
                    <li key={a.id} className='flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center'>
                      <div className='flex min-w-0 flex-1 items-center gap-3'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cream'>
                          <Icon name={a.type === 'qq' ? 'qq' : a.type === 'wx' ? 'wechat' : 'alipay'} size={18} />
                        </div>
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            <span className='truncate text-sm font-medium text-cream/90'>{a.name}</span>
                            <span
                              className={cx(
                                'rounded-full border px-2 py-0.5 text-[10px]',
                                a.status === 1
                                  ? 'border-mint/30 bg-mint/10 text-mint'
                                  : 'border-white/15 bg-white/5 text-white/45'
                              )}
                            >
                              {a.status === 1 ? '启用' : '停用'}
                            </span>
                          </div>
                          <p className='mt-0.5 truncate font-mono text-[11px] text-white/35'>
                            {a.appid} · {a.appkey} · 归属 {a.owner}
                          </p>
                        </div>
                      </div>
                      <div className='flex shrink-0 items-center gap-1.5'>
                        <button
                          type='button'
                          onClick={() => toggleApp(a)}
                          className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition hover:bg-white/10 hover:text-white'
                        >
                          {a.status === 1 ? '停用' : '启用'}
                        </button>
                        <button
                          type='button'
                          onClick={() => setDelApp(a)}
                          className='rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300 transition hover:bg-red-500/20'
                        >
                          删除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className='flex items-center justify-between border-t border-white/8 bg-ink-900/50 px-6 py-4'>
                <button
                  type='button'
                  onClick={() => setAppPage((p) => Math.max(1, p - 1))}
                  disabled={appPage <= 1 || appsLoading}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40'
                >
                  <Icon name='arrow-left' size={13} />
                  上一页
                </button>
                <span className='text-xs text-white/35'>
                  {appPage} / {Math.max(1, Math.ceil((apps?.total ?? 0) / (apps?.size ?? 20)))}
                </span>
                <button
                  type='button'
                  onClick={() => setAppPage((p) => p + 1)}
                  disabled={appsLoading || appPage >= Math.max(1, Math.ceil((apps?.total ?? 0) / (apps?.size ?? 20)))}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40'
                >
                  下一页
                  <Icon name='arrow-right' size={13} />
                </button>
              </div>
            </section>
          ) : null}

          {tab === 'logs' ? (
            <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
              <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h1 className='text-lg font-semibold text-cream'>审计日志</h1>
                  <p className='mt-1 text-xs text-white/40'>管理操作与用户行为全程留痕</p>
                </div>
                <div className='flex rounded-xl border border-white/12 bg-white/5 p-1'>
                  {[
                    { k: 'admin' as const, label: '管理操作' },
                    { k: 'user' as const, label: '用户行为' },
                  ].map((m) => (
                    <button
                      key={m.k}
                      type='button'
                      onClick={() => {
                        setLogMode(m.k);
                        if (m.k === 'admin') setLogPage(1);
                        else setUserLogPage(1);
                      }}
                      className={cx(
                        'rounded-lg px-3 py-1.5 text-xs transition',
                        logMode === m.k ? 'bg-white/12 font-medium text-cream' : 'text-white/55 hover:text-white/85'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {logsLoading ? (
                <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
                  <Spinner size={18} />
                  正在加载…
                </div>
              ) : logMode === 'admin' ? (
                (logs?.items.length ?? 0) === 0 ? (
                  <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
                      <Icon name='shield' size={22} />
                    </div>
                    <p className='text-sm text-white/35'>暂无管理操作记录</p>
                  </div>
                ) : (
                  <ul className='divide-y divide-white/8'>
                    {logs?.items.map((l) => (
                      <li key={l.id} className='flex items-center gap-3 px-6 py-3.5'>
                        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-lilac-400/30 bg-lilac-400/10 text-lilac-300'>
                          <Icon name='shield' size={14} />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm text-cream/90'>{l.detail || l.action}</p>
                          <p className='mt-0.5 truncate font-mono text-[11px] text-white/30'>
                            {l.username} · {l.action} {l.target ? '· ' + l.target : ''}
                          </p>
                        </div>
                        <div className='hidden shrink-0 text-right sm:block'>
                          <p className='text-xs text-white/55'>{l.date}</p>
                          <p className='mt-0.5 font-mono text-[11px] text-white/30'>{l.ip || '-'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (userLogs?.items.length ?? 0) === 0 ? (
                <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
                  <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
                    <Icon name='logs' size={22} />
                  </div>
                  <p className='text-sm text-white/35'>暂无用户行为记录</p>
                </div>
              ) : (
                <ul className='divide-y divide-white/8'>
                  {userLogs?.items.map((l, i) => (
                    <li key={i} className='flex items-center gap-3 px-6 py-3.5'>
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky/30 bg-sky/10 text-sky'>
                        <Icon name='sparkle' size={14} />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm text-cream/90'>{logLabel(l.type)}</p>
                        <p className='mt-0.5 truncate font-mono text-[11px] text-white/30'>{l.username} · {l.type}</p>
                      </div>
                      <div className='hidden shrink-0 text-right sm:block'>
                        <p className='text-xs text-white/55'>{l.date}</p>
                        <p className='mt-0.5 font-mono text-[11px] text-white/30'>{l.ip || '-'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className='flex items-center justify-between border-t border-white/8 bg-ink-900/50 px-6 py-4'>
                <button
                  type='button'
                  onClick={() => (logMode === 'admin' ? setLogPage((p) => Math.max(1, p - 1)) : setUserLogPage((p) => Math.max(1, p - 1)))}
                  disabled={(logMode === 'admin' ? logPage : userLogPage) <= 1 || logsLoading}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40'
                >
                  <Icon name='arrow-left' size={13} />
                  上一页
                </button>
                <span className='text-xs text-white/35'>
                  {logMode === 'admin' ? logPage : userLogPage} /{' '}
                  {Math.max(
                    1,
                    Math.ceil(
                      (logMode === 'admin' ? logs?.total ?? 0 : userLogs?.total ?? 0) /
                        (logMode === 'admin' ? logs?.size ?? 20 : userLogs?.size ?? 20)
                    )
                  )}
                </span>
                <button
                  type='button'
                  onClick={() => (logMode === 'admin' ? setLogPage((p) => p + 1) : setUserLogPage((p) => p + 1))}
                  disabled={
                    logsLoading ||
                    (logMode === 'admin'
                      ? logPage >= Math.max(1, Math.ceil((logs?.total ?? 0) / (logs?.size ?? 20)))
                      : userLogPage >= Math.max(1, Math.ceil((userLogs?.total ?? 0) / (userLogs?.size ?? 20))))
                  }
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40'
                >
                  下一页
                  <Icon name='arrow-right' size={13} />
                </button>
              </div>
            </section>
          ) : null}
        </main>
      </div>


      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title='编辑用户'
        subtitle={'UID ' + (editUser?.uid || '') + ' · ' + (editUser?.username || '')}
        width='max-w-md'
        footer={
          <>
            <button type='button' onClick={() => setEditUser(null)} className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'>取消</button>
            <button type='button' onClick={submitEditUser} disabled={editUserBusy} className='inline-flex items-center justify-center gap-1.5 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold leading-none text-on-pudding transition hover:brightness-105 disabled:opacity-60'>{editUserBusy ? <Spinner size={14} /> : <Icon name='check' size={14} />} 保存</button>
          </>
        }
      >
        <div className='space-y-4'>
          <Field label='昵称'>
            <input type='text' value={editNick} onChange={(e) => setEditNick(e.target.value)} placeholder='用户昵称' className={inputCls()} />
          </Field>
          <Field label='邮箱'>
            <input type='email' value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder='user@example.com' className={inputCls()} />
          </Field>
          <Field label='手机号'>
            <input type='text' value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder='13800138000' className={inputCls()} />
          </Field>
          <Field label='用户组'>
            <select value={editGid} onChange={(e) => setEditGid(parseInt(e.target.value) || 0)} className={inputCls()}>
              <option value={0}>无</option>
              {groups.map((g) => <option key={g.gid} value={g.gid}>{g.name}</option>)}
            </select>
          </Field>
          <Field label='余额'>
            <input type='number' step='0.01' min={0} value={editMoney} onChange={(e) => setEditMoney(e.target.value)} placeholder='0.00' className={inputCls()} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={pwdTarget !== null}
        onClose={() => {
          setPwdTarget(null);
          setNewPwd('');
        }}
        title='重置密码'
        subtitle={'为 ' + (pwdTarget?.nickname || pwdTarget?.username || '') + ' 设置新密码'}
        width='max-w-md'
        footer={
          <>
            <button
              type='button'
              onClick={() => {
                setPwdTarget(null);
                setNewPwd('');
              }}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              取消
            </button>
            <button
              type='button'
              onClick={submitPwd}
              disabled={pwdBusy}
              className='inline-flex items-center gap-2 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
            >
              {pwdBusy ? <Spinner size={14} /> : <Icon name='check' size={14} />}
              确认重置
            </button>
          </>
        }
      >
        <Field label='新密码' hint={<span className='text-[11px] text-white/30'>6-64 位，不能纯数字</span>}>
          <input
            type='text'
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder='请输入新密码'
            className={inputCls()}
          />
        </Field>
      </Modal>

      <Modal
        open={delApp !== null}
        onClose={() => setDelApp(null)}
        title='删除应用'
        subtitle='删除后该 AppID 与 AppKey 立即失效且不可恢复'
        width='max-w-md'
        footer={
          <>
            <button
              type='button'
              onClick={() => setDelApp(null)}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              取消
            </button>
            <button
              type='button'
              onClick={submitDelApp}
              disabled={appBusy}
              className='inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60'
            >
              {appBusy ? <Spinner size={14} /> : <Icon name='trash' size={14} />}
              确认删除
            </button>
          </>
        }
      >
        <p className='text-sm leading-relaxed text-white/60'>
          正在删除应用 {delApp?.name || ''}（{delApp?.appid || ''}），归属用户 {delApp?.owner || '-'}。
        </p>
      </Modal>

      <Modal
        open={selfPwdOpen}
        onClose={() => {
          setSelfPwdOpen(false);
          setOldSelfPwd('');
          setNewSelfPwd('');
          setNewSelfPwd2('');
        }}
        title='修改密码'
        subtitle='修改当前管理员账号的登录密码'
        width='max-w-md'
        footer={
          <>
            <button
              type='button'
              onClick={() => {
                setSelfPwdOpen(false);
                setOldSelfPwd('');
                setNewSelfPwd('');
                setNewSelfPwd2('');
              }}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/10'
            >
              取消
            </button>
            <button
              type='button'
              onClick={changeSelfPwd}
              disabled={selfPwdBusy}
              className='inline-flex items-center justify-center gap-1.5 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold leading-none text-on-pudding transition hover:brightness-105 disabled:opacity-60'
            >
              {selfPwdBusy ? <Spinner size={14} /> : <Icon name='check' size={14} />}
              确认修改
            </button>
          </>
        }
      >
        <div className='space-y-4'>
          <Field label='当前密码'>
            <input
              type='password'
              value={oldSelfPwd}
              onChange={(e) => setOldSelfPwd(e.target.value)}
              placeholder='请输入当前密码'
              className={inputCls()}
            />
          </Field>
          <Field label='新密码' hint={<span className='text-[11px] text-white/30'>6-64 位，不能纯数字，不能与用户名相同</span>}>
            <input
              type='password'
              value={newSelfPwd}
              onChange={(e) => setNewSelfPwd(e.target.value)}
              placeholder='请输入新密码'
              className={inputCls()}
            />
          </Field>
          <Field label='确认新密码'>
            <input
              type='password'
              value={newSelfPwd2}
              onChange={(e) => setNewSelfPwd2(e.target.value)}
              placeholder='请再次输入新密码'
              className={inputCls()}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
