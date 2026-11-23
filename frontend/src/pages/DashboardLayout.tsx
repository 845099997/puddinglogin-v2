import { useEffect, useState, type ReactNode } from 'react';
import Icon, { type IconName } from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';
import { post, type Site, type User } from '../lib/api';
import { cx, useToast } from '../lib/ui';

type NavItem = { key: string; label: string; icon: IconName; href?: string };
const NAV: NavItem[] = [
  { key: 'dashboard', label: '概览', icon: 'dashboard' },
  { key: 'apps', label: '我的应用', icon: 'apps' },
  { key: 'accounts', label: '授权账号', icon: 'accounts' },
  { key: 'logs', label: '登录日志', icon: 'logs' },
  { key: 'tickets', label: '我的工单', icon: 'mail' },
  { key: 'test', label: '登录测试', icon: 'refresh' },
  { key: 'profile', label: '账号资料', icon: 'profile' },
  { key: 'doc', label: '开发文档', icon: 'logs', href: '/doc.php' },
];



export default function DashboardLayout({
  site,
  user,
  current,
  children,
  onGo,
  onUser,
}: {
  site: Site;
  user: User;
  current: string;
  children: ReactNode;
  onGo: (p: string) => void;
  onUser: (u: User | null) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const items = NAV;

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [current]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    const res = await post('logout');
    setBusy(false);
    if (res.code === 0) {
      onUser(null);
      onGo('login');
      toast.push('info', '已安全退出');
    } else {
      toast.push('error', res.msg || '退出失败');
    }
  }

  const initial = (user.nickname || user.username || 'P').slice(0, 1).toUpperCase();
  const avatar = user.avatar || '';

  const sidebar = (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-3 px-5 py-6'>
        <img src={site.logo_path || '/logo.png'} alt={site.sitename} className='h-10 w-10 rounded-2xl object-contain shadow-glow' />
        <div className='min-w-0'>
          <div className='truncate text-[15px] font-semibold text-cream'>{site.sitename}</div>
          <div className='truncate text-[11px] uppercase tracking-[0.18em] text-white/30'>Console</div>
        </div>
      </div>

      <nav className='flex-1 space-y-1 px-3'>
        {items.map((n) =>
          n.href ? (
            <a
              key={n.key}
              href={n.href}
              target='_blank'
              rel='noreferrer'
              className='group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] text-white/45 transition hover:bg-white/[0.04] hover:text-white/80'
            >
              <span className='text-white/35 transition group-hover:text-white/60'>
                <Icon name={n.icon} size={18} />
              </span>
              <span className='font-medium'>{n.label}</span>
              <Icon name='external' size={12} className='ml-auto text-white/25' />
            </a>
          ) : (
            <button
              key={n.key}
              type='button'
              onClick={() => onGo(n.key)}
              className={cx(
                'group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] transition',
                current === n.key
                  ? 'bg-white/[0.08] text-cream shadow-soft'
                  : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
              )}
            >
              <span className={cx('transition', current === n.key ? 'text-pudding-300' : 'text-white/35 group-hover:text-white/60')}>
                <Icon name={n.icon} size={18} />
              </span>
              <span className='font-medium'>{n.label}</span>
            </button>
          )
        )}
      </nav>

      <div className='border-t border-white/8 p-3'>
        <button
          type='button'
          onClick={logout}
          disabled={busy}
          className='flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] text-white/45 transition hover:bg-red-500/10 hover:text-red-200'
        >
          <Icon name='logout' size={18} />
          <span className='font-medium'>{busy ? '退出中…' : '退出登录'}</span>
        </button>
        <p className='px-3.5 pt-2 text-[11px] text-white/22'>
          {site.sitename} · v{site.version}
        </p>
      </div>
    </div>
  );

  return (
    <div className='relative min-h-screen bg-ink-900'>
      <div className='pointer-events-none absolute inset-0 bg-mesh opacity-40' />

      <div className='relative mx-auto flex w-full max-w-[1180px]'>
        <aside className='sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-white/8 bg-ink-850/60 backdrop-blur-xl lg:block'>
          {sidebar}
        </aside>

        {open ? (
          <div className='fixed inset-0 z-[70] lg:hidden'>
            <div className='absolute inset-0 bg-ink-950/70 backdrop-blur-sm' onClick={() => setOpen(false)} />
            <div className='absolute inset-y-0 left-0 w-[268px] animate-fade-in border-r border-white/8 bg-ink-850'>{sidebar}</div>
          </div>
        ) : null}

        <div className='min-w-0 flex-1'>
          <header className='sticky top-0 z-40 border-b border-white/8 bg-ink-900/80 backdrop-blur-xl'>
            <div className='flex h-16 items-center gap-3 px-4 sm:px-6'>
              <button
                type='button'
                onClick={() => setOpen(true)}
                className='rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 lg:hidden'
                aria-label='打开导航'
              >
                <Icon name='menu' size={18} />
              </button>

              <div className='min-w-0 flex-1'>
                <div className='truncate text-[15px] font-semibold text-cream'>
                  {items.find((n) => n.key === current)?.label || '概览'}
                </div>
                <div className='truncate text-[11px] text-white/30'>
                  {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </div>
              </div>

              <ThemeToggle />

              <div className='relative'>
                <button
                  type='button'
                  onClick={() => setMenu((v) => !v)}
                  className='flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-1.5 transition hover:bg-white/[0.08]'
                >
                  {avatar ? (
                    <img src={avatar} alt='' className='h-7 w-7 rounded-full object-cover' />
                  ) : (
                    <span className='flex h-7 w-7 items-center justify-center rounded-full bg-pudding-gradient text-[12px] font-bold text-on-pudding'>
                      {initial}
                    </span>
                  )}
                  <span className='hidden max-w-[120px] truncate text-[13px] text-cream/85 sm:block'>
                    {user.nickname || user.username}
                  </span>
                  <Icon name='arrow-right' size={13} className='hidden rotate-90 text-white/30 sm:block' />
                </button>
                {menu ? (
                  <div className='absolute right-0 top-full z-50 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 p-1.5 shadow-card backdrop-blur-xl'>
                    <div className='px-3 py-2'>
                      <div className='truncate text-[13px] font-medium text-cream'>{user.nickname || user.username}</div>
                      <div className='truncate text-[11px] text-white/35'>UID {user.uid}{user.email ? ' · ' + user.email : ''}</div>
                    </div>
                    <div className='my-1 h-px bg-white/8' />
                    <button
                      type='button'
                      onClick={() => onGo('profile')}
                      className='flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/70 transition hover:bg-white/8 hover:text-white'
                    >
                      <Icon name='profile' size={15} /> 账号资料
                    </button>
                    <button
                      type='button'
                      onClick={logout}
                      disabled={busy}
                      className='flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/70 transition hover:bg-red-500/12 hover:text-red-200'
                    >
                      <Icon name='logout' size={15} /> 退出登录
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className='px-4 pb-16 pt-6 sm:px-6' onClick={() => menu && setMenu(false)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
