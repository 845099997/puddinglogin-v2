import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { get, type LoginType } from '../lib/api';
import { Spinner, useToast } from '../lib/ui';

export type LoginLogItem = {
  id: number;
  uid: number;
  username: string;
  appid: string;
  type: string;
  way: string;
  social_uid: string;
  domain: string;
  ip: string;
  date: string;
};

type Paged<T> = { items: T[]; total: number; page: number; size: number };

const inputCls =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60';

export default function AdminLoginLogsPage({ types }: { types: LoginType[] }) {
  const toast = useToast();
  const [data, setData] = useState<Paged<LoginLogItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [kw, setKw] = useState('');
  const [way, setWay] = useState('all');

  const load = useCallback(
    (p: number, k: string, w: string) => {
      setLoading(true);
      const params: Record<string, string | number> = { page: p, type: w };
      if (k.trim() !== '') params.kw = k.trim();
      get<Paged<LoginLogItem>>('admin.loginlogs', params).then((res) => {
        if (res.code === 0 && res.data) setData(res.data);
        else toast.push('error', res.msg || '加载登录记录失败');
        setLoading(false);
      });
    },
    [toast]
  );

  useEffect(() => {
    load(page, kw, way);
  }, [page, way, load]);

  const search = () => {
    setPage(1);
    load(1, kw, way);
  };

  const nameOf = (t: string) => {
    if (t === '') return '账号密码';
    const hit = types.find((x) => x.type === t);
    return hit ? hit.name : t;
  };

  const total = data?.total ?? 0;
  const size = data?.size ?? 20;
  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
      <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5'>
        <div>
          <h1 className='text-lg font-semibold text-cream'>登录记录</h1>
          <p className='mt-1 text-xs text-white/40'>共 {total} 条登录日志 · 来源域名与应用便于追溯授权链路</p>
        </div>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <div className='relative flex-1'>
            <div className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30'>
              <Icon name='search' size={14} />
            </div>
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search();
              }}
              placeholder='搜索三方 UID、来源域名或 IP'
              className={inputCls + ' pl-10'}
            />
          </div>
          <select
            value={way}
            onChange={(e) => {
              setWay(e.target.value);
              setPage(1);
            }}
            className={inputCls + ' sm:w-44'}
          >
            <option value='all'>全部方式</option>
            {types.map((t) => (
              <option key={t.type} value={t.type}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type='button'
            onClick={search}
            className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white'
          >
            查询
          </button>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
          <Spinner size={18} /> 正在加载…
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
          <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
            <Icon name='logs' size={22} />
          </div>
          <p className='text-sm text-white/35'>暂无登录记录</p>
          <p className='text-[12px] text-white/25'>用户通过聚合登录成功后会记录来源应用、方式与域名</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[920px] text-left text-sm'>
            <thead>
              <tr className='border-b border-white/8 bg-white/[0.03] text-[12px] uppercase tracking-wide text-white/45'>
                <th className='px-6 py-3 font-medium'>用户</th>
                <th className='px-4 py-3 font-medium'>登录方式</th>
                <th className='px-4 py-3 font-medium'>三方 UID</th>
                <th className='px-4 py-3 font-medium'>来源域名</th>
                <th className='px-4 py-3 font-medium'>来源应用</th>
                <th className='px-4 py-3 font-medium'>IP</th>
                <th className='px-4 py-3 text-right font-medium'>时间</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/8'>
              {data.items.map((l) => (
                <tr key={l.id} className='transition hover:bg-white/[0.03]'>
                  <td className='px-6 py-3.5'>
                    <div className='text-cream/85'>{l.username}</div>
                    <div className='mt-0.5 text-[11px] text-white/35'>UID {l.uid}</div>
                  </td>
                  <td className='px-4 py-3.5'>
                    <span className='chip'>{l.way ? nameOf(l.way) : nameOf('')}</span>
                  </td>
                  <td className='px-4 py-3.5 font-mono text-[12px] text-white/65'>{l.social_uid || '-'}</td>
                  <td className='px-4 py-3.5 text-[12px] text-white/55'>{l.domain || '-'}</td>
                  <td className='px-4 py-3.5 font-mono text-[11px] text-white/45'>{l.appid || '-'}</td>
                  <td className='px-4 py-3.5 text-[12px] text-white/50'>{l.ip || '-'}</td>
                  <td className='px-4 py-3.5 text-right text-[12px] text-white/55'>{l.date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className='flex items-center justify-between border-t border-white/8 px-6 py-4 text-xs text-white/45'>
          <span>
            第 {data?.page ?? 1} / {pages} 页
          </span>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-white/65 transition hover:bg-white/10 disabled:opacity-40'
            >
              上一页
            </button>
            <button
              type='button'
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-white/65 transition hover:bg-white/10 disabled:opacity-40'
            >
              下一页
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

