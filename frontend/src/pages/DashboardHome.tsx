import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { get, logLabel, type User } from '../lib/api';
import { Spinner, cx } from '../lib/ui';

type Overview = {
  user: User;
  stats: { apps: number; accounts: number; logs: number };
  recent: Array<{ type: string; date: string; ip: string }>;
  chart: Array<{ day: string; count: number }>;
};

const CARD_META = [
  { key: 'apps' as const, label: '我的应用', icon: 'apps' as const, go: 'apps', tone: 'from-pudding-300/22 to-pudding-500/8', ring: 'text-pudding-300' },
  { key: 'accounts' as const, label: '授权账号', icon: 'accounts' as const, go: 'accounts', tone: 'from-berry-400/22 to-berry-600/8', ring: 'text-berry-300' },
  { key: 'logs' as const, label: '登录记录', icon: 'logs' as const, go: 'logs', tone: 'from-lilac-400/22 to-lilac-500/8', ring: 'text-lilac-300' },
];

export default function DashboardHome({ user, onGo }: { user: User; onGo: (p: string) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    get<Overview>('overview').then((res) => {
      if (!alive) return;
      if (res.code === 0 && res.data) setData(res.data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stats = data?.stats ?? { apps: 0, accounts: 0, logs: 0 };
  const chart = data?.chart ?? [];
  const recent = data?.recent ?? [];
  const peak = Math.max(1, ...chart.map((c) => c.count));
  const total7 = chart.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className='mx-auto w-full max-w-6xl space-y-6'>
      <section className='relative overflow-hidden rounded-3xl border border-white/10 bg-mesh p-6 shadow-card sm:p-8'>
        <div className='pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-berry-500/20 blur-3xl' />
        <div className='relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-xs font-medium uppercase tracking-[0.2em] text-white/40'>Overview</p>
            <h1 className='mt-2 text-2xl font-semibold text-cream sm:text-3xl'>
              你好，{user.nickname || user.username}
            </h1>
            <p className='mt-2 max-w-lg text-sm leading-relaxed text-white/50'>
              这里是 PuddingLogin 控制台，管理你的聚合登录应用、授权账号与登录记录。
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => onGo('apps')}
              className='inline-flex items-center gap-2 rounded-2xl bg-pudding-gradient px-5 py-3 text-sm font-semibold text-on-pudding shadow-glow transition hover:brightness-105 active:scale-[0.98]'
            >
              <Icon name='plus' size={16} />
              创建应用
            </button>
            <button
              type='button'
              onClick={() => onGo('profile')}
              className='hidden items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex'
            >
              <Icon name='profile' size={16} />
              账号资料
            </button>
          </div>
        </div>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {CARD_META.map((card) => (
          <button
            key={card.key}
            type='button'
            onClick={() => onGo(card.go)}
            className='group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 p-5 text-left shadow-soft transition hover:border-white/20 hover:bg-ink-800/80'
          >
            <div className={cx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60', card.tone)} />
            <div className='relative flex items-start justify-between'>
              <div className={cx('rounded-2xl border border-white/10 bg-white/5 p-2.5', card.ring)}>
                <Icon name={card.icon} size={20} />
              </div>
              <Icon name='arrow-right' size={16} className='text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60' />
            </div>
            <p className='relative mt-5 text-3xl font-semibold tracking-tight text-cream'>
              {loading ? <span className='text-white/25'>--</span> : stats[card.key]}
            </p>
            <p className='relative mt-1 text-sm text-white/50'>{card.label}</p>
          </button>
        ))}
        <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 p-5 shadow-soft'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-mint/16 to-sky/6 opacity-70' />
          <div className='relative flex items-start justify-between'>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-2.5 text-mint'>
              <Icon name='chart' size={20} />
            </div>
            <span className='rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 text-[11px] font-medium text-mint'>近 7 天</span>
          </div>
          <p className='relative mt-5 text-3xl font-semibold tracking-tight text-cream'>
            {loading ? <span className='text-white/25'>--</span> : total7}
          </p>
          <p className='relative mt-1 text-sm text-white/50'>操作次数</p>
        </div>
      </section>

      <div className='grid gap-6 lg:grid-cols-[1.35fr_1fr]'>
        <section className='rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-base font-semibold text-cream'>活跃趋势</h2>
              <p className='mt-1 text-xs text-white/40'>最近 7 天的操作次数统计</p>
            </div>
            {loading ? <Spinner size={16} /> : null}
          </div>
          <div className='mt-6 flex h-44 items-end gap-2 sm:gap-3'>
            {chart.length === 0 ? (
              <div className='flex h-full w-full items-center justify-center text-sm text-white/30'>暂无数据</div>
            ) : (
              chart.map((c) => (
                <div key={c.day} className='group flex h-full flex-1 flex-col items-center justify-end gap-2'>
                  <span className='text-[11px] tabular-nums text-white/40 group-hover:text-white/70'>{c.count}</span>
                  <div className='relative flex w-full flex-1 items-end'>
                    <div
                      className='w-full rounded-t-lg bg-gradient-to-t from-lilac-500/45 via-berry-500/70 to-pudding-400 transition-all duration-500 group-hover:brightness-110'
                      style={{ height: Math.max(6, Math.round((c.count / peak) * 100)) + '%' }}
                    />
                  </div>
                  <span className='text-[11px] text-white/35'>{c.day}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className='rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft'>
          <div className='flex items-center justify-between'>
            <h2 className='text-base font-semibold text-cream'>最近动态</h2>
            <button
              type='button'
              onClick={() => onGo('logs')}
              className='inline-flex items-center gap-1 text-xs text-white/45 transition hover:text-white/80'
            >
              全部记录
              <Icon name='arrow-right' size={13} />
            </button>
          </div>
          <div className='mt-5 space-y-3'>
            {recent.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-12 text-center'>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
                  <Icon name='logs' size={22} />
                </div>
                <p className='text-sm text-white/35'>{loading ? '加载中…' : '暂无操作记录'}</p>
              </div>
            ) : (
              recent.map((r, i) => (
                <div key={i} className='flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3'>
                  <div className='rounded-xl border border-white/10 bg-white/5 p-2 text-pudding-300'>
                    <Icon name='sparkle' size={14} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm text-cream/90'>{logLabel(r.type)}</p>
                    <p className='mt-0.5 text-[11px] text-white/35'>{r.date}</p>
                  </div>
                  <span className='hidden shrink-0 font-mono text-[11px] text-white/30 sm:block'>{r.ip}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className='grid gap-4 sm:grid-cols-2'>
        <button
          type='button'
          onClick={() => onGo('accounts')}
          className='group flex items-center justify-between rounded-3xl border border-white/10 bg-ink-850/80 px-6 py-5 text-left shadow-soft transition hover:border-white/20 hover:bg-ink-800/80'
        >
          <div>
            <p className='text-sm font-semibold text-cream'>绑定第三方账号</p>
            <p className='mt-1 text-xs text-white/40'>绑定 QQ、微信、支付宝，实现一键登录</p>
          </div>
          <Icon name='arrow-right' size={18} className='text-white/25 transition group-hover:translate-x-1 group-hover:text-white/70' />
        </button>
        <button
          type='button'
          onClick={() => onGo('profile')}
          className='group flex items-center justify-between rounded-3xl border border-white/10 bg-ink-850/80 px-6 py-5 text-left shadow-soft transition hover:border-white/20 hover:bg-ink-800/80'
        >
          <div>
            <p className='text-sm font-semibold text-cream'>完善账号安全</p>
            <p className='mt-1 text-xs text-white/40'>设置昵称头像、修改登录密码</p>
          </div>
          <Icon name='shield' size={18} className='text-white/25 transition group-hover:text-white/70' />
        </button>
      </section>
    </div>
  );
}
