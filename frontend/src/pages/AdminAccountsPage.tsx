import { useCallback, useEffect, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { get, post, type LoginType } from '../lib/api';
import { Spinner, useToast } from '../lib/ui';

export type AccountItem = {
  id: number;
  uid: number;
  username: string;
  appid: string;
  type: string;
  social_uid: string;
  nickname: string;
  faceimg: string;
  gender: number;
  addtime: string;
  lasttime: string;
  lastip: string;
};

type Paged<T> = { items: T[]; total: number; page: number; size: number };

const inputCls =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60';

export default function AdminAccountsPage({ types }: { types: LoginType[] }) {
  const toast = useToast();
  const [data, setData] = useState<Paged<AccountItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [kw, setKw] = useState('');
  const [type, setType] = useState('all');
  const [appid, setAppid] = useState('');

  const load = useCallback(
    (p: number, k: string, t: string, a: string) => {
      setLoading(true);
      const params: Record<string, string | number> = { page: p, type: t };
      if (k.trim() !== '') params.kw = k.trim();
      if (a.trim() !== '') params.appid = a.trim();
      get<Paged<AccountItem>>('admin.accounts', params).then((res) => {
        if (res.code === 0 && res.data) setData(res.data);
        else toast.push('error', res.msg || '加载第三方账号失败');
        setLoading(false);
      });
    },
    [toast]
  );

  useEffect(() => {
    load(page, kw, type, appid);
  }, [page, type, load]);

  const search = () => {
    setPage(1);
    load(1, kw, type, appid);
  };

  const remove = async (a: AccountItem) => {
    if (!confirm('确定删除该第三方账号绑定？用户将解除此平台绑定')) return;
    const res = await post('admin.account.delete', { id: a.id });
    if (res.code === 0) {
      toast.push('success', res.msg || '已删除');
      load(page, kw, type, appid);
    } else {
      toast.push('error', res.msg || '删除失败');
    }
  };

  const nameOf = (t: string) => types.find((x) => x.type === t)?.name || t;
  const colorOf = (t: string) => types.find((x) => x.type === t)?.color || '#94a3b8';
  const iconOf = (t: string) => (types.find((x) => x.type === t)?.icon || 'accounts') as IconName;

  const total = data?.total ?? 0;
  const size = data?.size ?? 20;
  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
      <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5'>
        <div>
          <h1 className='text-lg font-semibold text-cream'>第三方账号列表</h1>
          <p className='mt-1 text-xs text-white/40'>共 {total} 个已绑定的第三方账号</p>
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
              placeholder='搜索三方 UID 或昵称'
              className={inputCls + ' pl-10'}
            />
          </div>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className={inputCls + ' sm:w-44'}
          >
            <option value='all'>全部平台</option>
            {types.map((t) => (
              <option key={t.type} value={t.type}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            value={appid}
            onChange={(e) => setAppid(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
            placeholder='应用 APPID'
            className={inputCls + ' sm:w-52'}
          />
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
            <Icon name='accounts' size={22} />
          </div>
          <p className='text-sm text-white/35'>暂无第三方账号记录</p>
          <p className='text-[12px] text-white/25'>用户通过聚合登录授权成功后会自动出现在此处</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[900px] text-left text-sm'>
            <thead>
              <tr className='border-b border-white/8 bg-white/[0.03] text-[12px] uppercase tracking-wide text-white/45'>
                <th className='px-6 py-3 font-medium'>平台</th>
                <th className='px-4 py-3 font-medium'>三方 UID</th>
                <th className='px-4 py-3 font-medium'>所属用户</th>
                <th className='px-4 py-3 font-medium'>应用</th>
                <th className='px-4 py-3 font-medium'>绑定时间</th>
                <th className='px-4 py-3 font-medium'>最后登录</th>
                <th className='px-4 py-3 text-right font-medium'>操作</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/8'>
              {data.items.map((a) => (
                <tr key={a.id} className='transition hover:bg-white/[0.03]'>
                  <td className='px-6 py-3.5'>
                    <div className='flex items-center gap-2.5'>
                      {a.faceimg ? (
                        <img
                          src={a.faceimg}
                          alt={a.nickname}
                          className='h-8 w-8 rounded-full border border-white/10 object-cover'
                          referrerPolicy='no-referrer'
                        />
                      ) : (
                        <div
                          className='flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5'
                          style={{ color: colorOf(a.type) }}
                        >
                          <Icon name={iconOf(a.type)} size={14} />
                        </div>
                      )}
                      <div>
                        <div className='text-[13px] text-cream/90'>{nameOf(a.type)}</div>
                        <div className='text-[11px] text-white/35'>{a.nickname || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3.5 font-mono text-[12px] text-white/65'>{a.social_uid || '-'}</td>
                  <td className='px-4 py-3.5'>
                    <div className='text-cream/85'>{a.username}</div>
                    <div className='mt-0.5 text-[11px] text-white/35'>UID {a.uid}</div>
                  </td>
                  <td className='px-4 py-3.5 font-mono text-[11px] text-white/45'>{a.appid || '-'}</td>
                  <td className='px-4 py-3.5 text-[12px] text-white/55'>{a.addtime || '-'}</td>
                  <td className='px-4 py-3.5'>
                    <div className='text-[12px] text-white/55'>{a.lasttime || '-'}</div>
                    <div className='mt-0.5 text-[11px] text-white/30'>{a.lastip || '-'}</div>
                  </td>
                  <td className='px-4 py-3.5 text-right'>
                    <button
                      type='button'
                      onClick={() => remove(a)}
                      className='rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] transition hover:bg-red-500/20'
                    >
                      删除
                    </button>
                  </td>
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
