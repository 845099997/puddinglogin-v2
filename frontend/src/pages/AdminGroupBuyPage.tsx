import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { get, post } from '../lib/api';
import { Spinner, useToast } from '../lib/ui';
import type { GroupItem } from './AdminGroupsPage';

const inputCls =
  'w-24 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-cream outline-none transition focus:border-pudding-300/60';

type Draft = { price: number; expire_months: number; sort: number; buyable: boolean };

export default function AdminGroupBuyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GroupItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const load = useCallback(() => {
    setLoading(true);
    get<{ items: GroupItem[]; open: boolean }>('admin.groups').then((res) => {
      if (res.code === 0 && res.data) {
        setItems(res.data.items);
        setOpen(res.data.open);
        const map: Record<number, Draft> = {};
        res.data.items.forEach((g) => {
          map[g.gid] = { price: g.price, expire_months: g.expire_months, sort: g.sort, buyable: g.buyable };
        });
        setDrafts(map);
      } else {
        toast.push('error', res.msg || '加载用户组失败');
      }
      setLoading(false);
    });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (gid: number, part: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [gid]: { ...d[gid], ...part } }));

  const saveAll = async () => {
    if (busy) return;
    setBusy(true);
    const payload = Object.keys(drafts).map((k) => ({ gid: Number(k), ...drafts[Number(k)] }));
    const res = await post('admin.group.buy', { open: open ? 1 : 0, items: JSON.stringify(payload) });
    setBusy(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '购买设置已保存');
      load();
    } else {
      toast.push('error', res.msg || '保存失败');
    }
  };

  const buyable = items.filter((g) => drafts[g.gid]?.buyable);
  const locked = items.filter((g) => !drafts[g.gid]?.buyable);

  const renderRow = (g: GroupItem, isBuyable: boolean) => {
    const d = drafts[g.gid];
    if (!d) return null;
    return (
      <tr key={g.gid} className='transition hover:bg-white/[0.03]'>
        <td className='px-4 py-3 text-white/55'>{g.gid}</td>
        <td className='px-4 py-3'>
          <span className='text-sm font-medium text-cream/90'>{g.name}</span>
        </td>
        {isBuyable ? (
          <>
            <td className='px-4 py-3'>
              <input
                type='number'
                min={0}
                step={0.01}
                value={d.price}
                onChange={(e) => patch(g.gid, { price: parseFloat(e.target.value) || 0 })}
                className={inputCls}
              />
            </td>
            <td className='px-4 py-3'>
              <input
                type='number'
                min={0}
                value={d.expire_months}
                onChange={(e) => patch(g.gid, { expire_months: parseInt(e.target.value) || 0 })}
                className={inputCls}
              />
            </td>
            <td className='px-4 py-3'>
              <input
                type='number'
                value={d.sort}
                onChange={(e) => patch(g.gid, { sort: parseInt(e.target.value) || 0 })}
                className={inputCls}
              />
            </td>
            <td className='px-4 py-3 text-right'>
              <button
                type='button'
                onClick={() => patch(g.gid, { buyable: false })}
                className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition hover:bg-white/10 hover:text-white'
              >
                下架
              </button>
            </td>
          </>
        ) : (
          <td className='px-4 py-3 text-right'>
            <button
              type='button'
              onClick={() => patch(g.gid, { buyable: true })}
              className='rounded-xl border border-mint/30 bg-mint/10 px-3 py-1.5 text-[11px] text-mint transition hover:bg-mint/20'
            >
              上架
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className='space-y-4'>
      <section className='rounded-3xl border border-white/10 bg-ink-850/80 px-6 py-5 shadow-soft'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-lg font-semibold text-cream'>用户组购买</h1>
            <p className='mt-1 text-xs text-white/40'>控制前台用户组购买页的售卖开关、价格与有效期</p>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-xs text-white/50'>购买开关：{open ? '已开启' : '已关闭'}</span>
            <button
              type='button'
              onClick={() => setOpen((v) => !v)}
              className={
                open
                  ? 'rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs text-red-200 transition hover:bg-red-500/20'
                  : 'rounded-xl border border-mint/30 bg-mint/10 px-4 py-2 text-xs text-mint transition hover:bg-mint/20'
              }
            >
              {open ? '点击关闭' : '点击开启'}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className='flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-ink-850/80 py-16 text-sm text-white/40'>
          <Spinner size={18} /> 正在加载…
        </section>
      ) : (
        <>
          <section className='overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
            <div className='border-b border-white/8 px-6 py-4'>
              <h2 className='text-sm font-semibold text-cream'>可购买的用户组（{buyable.length}）</h2>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[720px] text-left text-sm'>
                <thead>
                  <tr className='border-b border-white/8 bg-white/[0.03] text-[12px] uppercase tracking-wide text-white/45'>
                    <th className='px-4 py-3 font-medium'>GID</th>
                    <th className='px-4 py-3 font-medium'>用户组名称</th>
                    <th className='px-4 py-3 font-medium'>售价</th>
                    <th className='px-4 py-3 font-medium'>有效期（月）</th>
                    <th className='px-4 py-3 font-medium'>排序</th>
                    <th className='px-4 py-3 text-right font-medium'>操作</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/8'>
                  {buyable.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-6 py-10 text-center text-sm text-white/35'>
                        暂无可购买的用户组，可在下方列表点击上架
                      </td>
                    </tr>
                  ) : (
                    buyable.map((g) => renderRow(g, true))
                  )}
                </tbody>
              </table>
            </div>
            <div className='flex justify-center border-t border-white/8 px-6 py-4'>
              <button
                type='button'
                onClick={saveAll}
                disabled={busy}
                className='inline-flex items-center gap-1.5 rounded-xl bg-pudding-gradient px-8 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
              >
                {busy ? <Spinner size={14} /> : <Icon name='check' size={14} />} 保存全部
              </button>
            </div>
          </section>

          <section className='overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
            <div className='border-b border-white/8 px-6 py-4'>
              <h2 className='text-sm font-semibold text-cream'>不可购买的用户组（{locked.length}）</h2>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[720px] text-left text-sm'>
                <thead>
                  <tr className='border-b border-white/8 bg-white/[0.03] text-[12px] uppercase tracking-wide text-white/45'>
                    <th className='px-4 py-3 font-medium'>GID</th>
                    <th className='px-4 py-3 font-medium'>用户组名称</th>
                    <th className='px-4 py-3 text-right font-medium'>操作</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/8'>
                  {locked.length === 0 ? (
                    <tr>
                      <td colSpan={3} className='px-6 py-10 text-center text-sm text-white/35'>
                        全部用户组均已上架
                      </td>
                    </tr>
                  ) : (
                    locked.map((g) => renderRow(g, false))
                  )}
                </tbody>
              </table>
            </div>
            <div className='flex justify-center border-t border-white/8 px-6 py-4'>
              <button
                type='button'
                onClick={saveAll}
                disabled={busy}
                className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-8 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-60'
              >
                {busy ? <Spinner size={14} /> : <Icon name='check' size={14} />} 保存全部
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

