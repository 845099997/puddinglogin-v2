import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { get, logLabel } from '../lib/api';
import { cx, Spinner, useToast } from '../lib/ui';

type LogItem = { type: string; date: string; ip: string };
type Payload = { items: LogItem[]; total: number; page: number; size: number };

function toneOf(type: string) {
  if (type.startsWith('oauth_')) return 'border-sky/30 bg-sky/10 text-sky';
  if (type === 'login' || type === 'register') return 'border-mint/30 bg-mint/10 text-mint';
  if (type.startsWith('unbind_') || type === 'delete_app' || type === 'logout') return 'border-red-400/25 bg-red-500/10 text-red-200';
  if (type.startsWith('app') || type === 'reset_appkey' || type === 'create_app') return 'border-lilac-400/30 bg-lilac-400/10 text-lilac-300';
  return 'border-white/15 bg-white/5 text-white/55';
}

function iconOf(type: string) {
  if (type.startsWith('oauth_')) return 'link' as const;
  if (type === 'login') return 'shield' as const;
  if (type === 'register') return 'user' as const;
  if (type.startsWith('app') || type === 'reset_appkey') return 'apps' as const;
  if (type.startsWith('unbind_')) return 'close' as const;
  return 'sparkle' as const;
}

export default function LogsPage() {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      get<Payload>('logs', { page: p }).then((res) => {
        if (res.code === 0 && res.data) setData(res.data);
        else toast.push('error', res.msg || '加载失败');
        setLoading(false);
      });
    },
    [toast]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  const total = data?.total ?? 0;
  const size = data?.size ?? 15;
  const pages = Math.max(1, Math.ceil(total / size));
  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const k = keyword.trim();
    if (!k) return items;
    return items.filter((i) => logLabel(i.type).includes(k) || i.ip.includes(k) || i.date.includes(k));
  }, [items, keyword]);

  return (
    <div className='mx-auto w-full max-w-6xl space-y-6'>
      <section className='flex flex-col gap-4 rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-cream'>登录日志</h1>
          <p className='mt-1.5 text-sm text-white/45'>共 {total} 条记录 · 记录账号登录、授权与安全操作</p>
        </div>
        <div className='relative w-full sm:w-72'>
          <div className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30'>
            <Icon name='search' size={15} />
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder='筛选当前页记录'
            className='w-full rounded-2xl border border-white/12 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
          />
        </div>
      </section>

      <section className='overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
        <div className='flex items-center justify-between border-b border-white/8 px-6 py-4'>
          <h2 className='text-sm font-semibold text-cream'>操作记录</h2>
          {loading ? <Spinner size={16} /> : <span className='text-xs text-white/35'>第 {page} / {pages} 页</span>}
        </div>

        {loading ? (
          <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
            <Spinner size={18} />
            正在加载日志…
          </div>
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
              <Icon name='logs' size={22} />
            </div>
            <p className='text-sm text-white/35'>{keyword ? '当前页没有匹配的记录' : '暂无操作记录'}</p>
          </div>
        ) : (
          <ul className='divide-y divide-white/8'>
            {filtered.map((i, idx) => (
              <li key={idx} className='flex items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]'>
                <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', toneOf(i.type))}>
                  <Icon name={iconOf(i.type)} size={15} />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-cream/90'>{logLabel(i.type)}</p>
                  <p className='mt-0.5 font-mono text-[11px] text-white/30'>{i.type}</p>
                </div>
                <div className='hidden shrink-0 text-right sm:block'>
                  <p className='text-xs text-white/55'>{i.date}</p>
                  <p className='mt-0.5 font-mono text-[11px] text-white/30'>{i.ip || '-'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className='flex items-center justify-between border-t border-white/8 bg-ink-900/50 px-6 py-4'>
          <button
            type='button'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
          >
            <Icon name='arrow-left' size={13} />
            上一页
          </button>
          <span className='text-xs text-white/35'>
            {page} / {pages}
          </span>
          <button
            type='button'
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages || loading}
            className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
          >
            下一页
            <Icon name='arrow-right' size={13} />
          </button>
        </div>
      </section>
    </div>
  );
}

