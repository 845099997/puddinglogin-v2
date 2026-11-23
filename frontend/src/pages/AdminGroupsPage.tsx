import { useCallback, useEffect, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { get, post, type LoginType } from '../lib/api';
import { Modal, Spinner, useToast } from '../lib/ui';

export type GroupItem = {
  gid: number;
  name: string;
  ucount: number;
  info: string;
  price: number;
  expire_months: number;
  sort: number;
  buyable: boolean;
  logins: string;
};

const inputCls =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60';

const blank = (): GroupItem => ({
  gid: 0,
  name: '',
  ucount: 0,
  info: '{}',
  price: 0,
  expire_months: 0,
  sort: 0,
  buyable: false,
  logins: '',
});

export default function AdminGroupsPage({ types }: { types: LoginType[] }) {
  const toast = useToast();
  const [items, setItems] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<GroupItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    get<{ items: GroupItem[]; open: boolean }>('admin.groups').then((res) => {
      if (res.code === 0 && res.data) setItems(res.data.items);
      else toast.push('error', res.msg || '加载用户组失败');
      setLoading(false);
    });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (t: string) => types.find((x) => x.type === t)?.name || t;

  const labels = (g: GroupItem) =>
    g.logins === '' ? ['全部登录方式'] : g.logins.split(',').filter(Boolean).map(nameOf);

  const toggleLogin = (t: string) => {
    setDraft((d) => {
      if (!d) return d;
      const list = d.logins ? d.logins.split(',').filter(Boolean) : [];
      const next = list.includes(t) ? list.filter((x) => x !== t) : [...list, t];
      return { ...d, logins: next.join(',') };
    });
  };

  const save = async () => {
    if (!draft || busy) return;
    if (draft.name.trim() === '') {
      toast.push('error', '用户组名称不能为空');
      return;
    }
    setBusy(true);
    const res = await post('admin.group.save', {
      gid: draft.gid,
      name: draft.name.trim(),
      ucount: draft.ucount,
      info: draft.info || '{}',
      price: draft.price,
      expire_months: draft.expire_months,
      sort: draft.sort,
      buyable: draft.buyable ? 1 : 0,
      logins: draft.logins,
    });
    setBusy(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '已保存');
      setDraft(null);
      load();
    } else {
      toast.push('error', res.msg || '保存失败');
    }
  };

  const remove = async (gid: number) => {
    if (!confirm('确定删除该用户组？')) return;
    const res = await post('admin.group.delete', { gid });
    if (res.code === 0) {
      toast.push('success', res.msg || '已删除');
      load();
    } else {
      toast.push('error', res.msg || '删除失败');
    }
  };

  return (
    <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
      <div className='flex flex-col gap-4 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-lg font-semibold text-cream'>用户组设置</h1>
          <p className='mt-1 text-xs text-white/40'>
            系统共有 {items.length} 个用户组 · 未勾选登录方式的用户组默认全部开放
          </p>
        </div>
        <button
          type='button'
          onClick={() => setDraft(blank())}
          className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white'
        >
          <Icon name='plus' size={13} />
          新增用户组
        </button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
          <Spinner size={18} /> 正在加载…
        </div>
      ) : items.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
          <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
            <Icon name='accounts' size={22} />
          </div>
          <p className='text-sm text-white/35'>暂无用户组</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead>
              <tr className='border-b border-white/8 bg-white/[0.03] text-[12px] uppercase tracking-wide text-white/45'>
                <th className='px-6 py-3 font-medium'>GID</th>
                <th className='px-4 py-3 font-medium'>用户组名称</th>
                <th className='px-4 py-3 font-medium'>可用登录方式</th>
                <th className='px-4 py-3 font-medium'>数量上限</th>
                <th className='px-6 py-3 text-right font-medium'>操作</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/8'>
              {items.map((g) => (
                <tr key={g.gid} className='transition hover:bg-white/[0.03]'>
                  <td className='px-6 py-3.5 text-white/55'>{g.gid}</td>
                  <td className='px-4 py-3.5'>
                    <div className='font-medium text-cream/90'>{g.name}</div>
                    <div className='mt-0.5 text-[11px] text-white/35'>
                      {g.buyable
                        ? '售价 ￥' + g.price.toFixed(2) + ' · ' + (g.expire_months > 0 ? g.expire_months + ' 个月' : '永久')
                        : '未上架购买'}
                    </div>
                  </td>
                  <td className='px-4 py-3.5'>
                    <div className='flex flex-wrap gap-1.5'>
                      {labels(g).map((n) => (
                        <span key={n} className='chip'>
                          {n}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className='px-4 py-3.5 text-white/65'>{g.ucount > 0 ? g.ucount : '不限'}</td>
                  <td className='px-6 py-3.5'>
                    <div className='flex items-center justify-end gap-1.5'>
                      <button
                        type='button'
                        onClick={() => setDraft({ ...g })}
                        className='rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition hover:bg-white/10 hover:text-white'
                      >
                        编辑
                      </button>
                      <button
                        type='button'
                        onClick={() => remove(g.gid)}
                        className='rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] transition hover:bg-red-500/20'
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft && draft.gid > 0 ? '编辑用户组' : '新增用户组'}
        subtitle='售价与有效期等字段同时决定用户组购买页的展示'
        footer={
          <>
            <button
              type='button'
              onClick={() => setDraft(null)}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white'
            >
              取消
            </button>
            <button
              type='button'
              onClick={save}
              disabled={busy}
              className='inline-flex items-center gap-1.5 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
            >
              {busy ? <Spinner size={14} /> : <Icon name='check' size={14} />} 保存
            </button>
          </>
        }
      >
        {draft ? (
          <div className='space-y-4'>
            <div>
              <label className='label'>用户组名称</label>
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder='如 VIP1'
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <label className='label'>数量上限</label>
                <input
                  className={inputCls}
                  type='number'
                  min={0}
                  value={draft.ucount}
                  onChange={(e) => setDraft({ ...draft, ucount: parseInt(e.target.value) || 0 })}
                  placeholder='0 表示不限'
                />
              </div>
              <div>
                <label className='label'>排序</label>
                <input
                  className={inputCls}
                  type='number'
                  value={draft.sort}
                  onChange={(e) => setDraft({ ...draft, sort: parseInt(e.target.value) || 0 })}
                  placeholder='越小越靠前'
                />
              </div>
              <div>
                <label className='label'>售价（元）</label>
                <input
                  className={inputCls}
                  type='number'
                  min={0}
                  step={0.01}
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className='label'>有效期（月）</label>
                <input
                  className={inputCls}
                  type='number'
                  min={0}
                  value={draft.expire_months}
                  onChange={(e) => setDraft({ ...draft, expire_months: parseInt(e.target.value) || 0 })}
                  placeholder='0 表示永久'
                />
              </div>
            </div>
            <label className='flex cursor-pointer items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream/85'>
              <input
                type='checkbox'
                checked={draft.buyable}
                onChange={(e) => setDraft({ ...draft, buyable: e.target.checked })}
                className='h-4 w-4 accent-pudding-400'
              />
              允许前台购买该用户组
            </label>
            <div>
              <label className='label'>可用登录方式（不选表示全部）</label>
              <div className='flex flex-wrap gap-2'>
                {types.map((t) => {
                  const on = draft.logins.split(',').filter(Boolean).includes(t.type);
                  return (
                    <button
                      key={t.type}
                      type='button'
                      onClick={() => toggleLogin(t.type)}
                      className={
                        on
                          ? 'inline-flex items-center gap-1.5 rounded-full border border-pudding-400/60 bg-pudding-400/15 px-3 py-1.5 text-xs text-cream'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/55 transition hover:bg-white/10'
                      }
                    >
                      <Icon name={(t.icon || t.type) as IconName} size={13} />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

