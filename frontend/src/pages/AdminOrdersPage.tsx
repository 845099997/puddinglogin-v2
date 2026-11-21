import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { get, post } from '../lib/api';
import { Spinner, useToast } from '../lib/ui';

export type OrderItem = {
  id: number;
  orderno: string;
  uid: number;
  username: string;
  gid: number;
  title: string;
  amount: number;
  paytype: string;
  status: number;
  addtime: string;
  paytime: string;
  ip: string;
};

type Paged<T> = { items: T[]; total: number; page: number; size: number };

const inputCls =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: '待支付', cls: 'border-pudding-300/40 bg-pudding-300/10 text-pudding-200' },
  1: { text: '已支付', cls: 'border-mint/30 bg-mint/10 text-mint' },
  2: { text: '已关闭', cls: 'border-white/15 bg-white/5 text-white/45' },
};

const PAYTYPE: Record<string, string> = {
  alipay: '支付宝',
  wxpay: '微信支付',
  epay: '易支付',
  money: '余额',
};

export default function AdminOrdersPage() {
  const toast = useToast();
  const [data, setData] = useState<Paged<OrderItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [kw, setKw] = useState('');
  const [status, setStatus] = useState('all');
  const [uid, setUid] = useState('');

  const load = useCallback(
    (p: number, k: string, s: string, u: string) => {
      setLoading(true);
      const params: Record<string, string | number> = { page: p, status: s };
      if (k.trim() !== '') params.kw = k.trim();
      if (u.trim() !== '' && Number(u) > 0) params.uid = Number(u);
      get<Paged<OrderItem>>('admin.orders', params).then((res) => {
        if (res.code === 0 && res.data) setData(res.data);
        else toast.push('error', res.msg || '加载订单失败');
        setLoading(false);
      });
    },
    [toast]
  );

  useEffect(() => {
    load(page, kw, status, uid);
  }, [page, status, load]);

  const search = () => {
    setPage(1);
    load(1, kw, status, uid);
  };

  const closeOrder = async (o: OrderItem) => {
    if (!confirm('确定关闭订单 ' + o.orderno + ' ？')) return;
    const res = await post('admin.order.close', { id: o.id });
    if (res.code === 0) {
      toast.push('success', res.msg || '订单已关闭');
      load(page, kw, status, uid);
    } else {
      toast.push('error', res.msg || '关闭失败');
    }
  };

  const total = data?.total ?? 0;
  const size = data?.size ?? 20;
  const pages = Math.max(1, Math.ceil(total / size));
  const paid = data ? data.items.filter((o) => o.status === 1).reduce((s, o) => s + o.amount, 0) : 0;

  return (
    <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
      <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5'>
        <div>
          <h1 className='text-lg font-semibold text-cream'>支付订单</h1>
          <p className='mt-1 text-xs text-white/40'>共 {total} 笔订单 · 本页已支付金额 ￥{paid.toFixed(2)}</p>
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
              placeholder='搜索订单号或商品名称'
              className={inputCls + ' pl-10'}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={inputCls + ' sm:w-40'}
          >
            <option value='all'>全部状态</option>
            <option value='0'>待支付</option>
            <option value='1'>已支付</option>
            <option value='2'>已关闭</option>
          </select>
          <input
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
            placeholder='用户 UID'
            className={inputCls + ' sm:w-32'}
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
            <Icon name='chart' size={22} />
          </div>
          <p className='text-sm text-white/35'>暂无订单记录</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[900px] text-left text-sm'>
            <thead>
              <tr className='border-b border-white/8 bg-white/[0.03] text-[12px] uppercase tracking-wide text-white/45'>
                <th className='px-6 py-3 font-medium'>订单号</th>
                <th className='px-4 py-3 font-medium'>用户</th>
                <th className='px-4 py-3 font-medium'>商品</th>
                <th className='px-4 py-3 font-medium'>金额</th>
                <th className='px-4 py-3 font-medium'>状态</th>
                <th className='px-4 py-3 font-medium'>创建时间</th>
                <th className='px-4 py-3 text-right font-medium'>操作</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/8'>
              {data.items.map((o) => {
                const st = STATUS[o.status] || STATUS[0];
                return (
                  <tr key={o.id} className='transition hover:bg-white/[0.03]'>
                    <td className='px-6 py-3.5'>
                      <div className='font-mono text-[12px] text-cream/85'>{o.orderno}</div>
                      <div className='mt-0.5 text-[11px] text-white/35'>{o.ip || '-'}</div>
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='text-cream/85'>{o.username}</div>
                      <div className='mt-0.5 text-[11px] text-white/35'>UID {o.uid}</div>
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='text-cream/85'>{o.title || '-'}</div>
                      <div className='mt-0.5 text-[11px] text-white/35'>{PAYTYPE[o.paytype] || o.paytype || '未选择'}</div>
                    </td>
                    <td className='px-4 py-3.5 font-medium text-pudding-300'>￥{o.amount.toFixed(2)}</td>
                    <td className='px-4 py-3.5'>
                      <span className={'inline-flex rounded-full border px-2.5 py-1 text-[11px] ' + st.cls}>{st.text}</span>
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='text-[12px] text-white/60'>{o.addtime || '-'}</div>
                      {o.paytime ? <div className='mt-0.5 text-[11px] text-white/35'>支付 {o.paytime}</div> : null}
                    </td>
                    <td className='px-4 py-3.5 text-right'>
                      {o.status === 0 ? (
                        <button
                          type='button'
                          onClick={() => closeOrder(o)}
                          className='rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] transition hover:bg-red-500/20'
                        >
                          关闭
                        </button>
                      ) : (
                        <span className='text-[11px] text-white/25'>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className='flex items-center justify-between border-t border-white/8 px-6 py-4 text-xs text-white/45'>
          <span>第 {data?.page ?? 1} / {pages} 页</span>
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
