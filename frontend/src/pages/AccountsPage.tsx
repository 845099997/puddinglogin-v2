import { useCallback, useEffect, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { get, post, type Site } from '../lib/api';
import { cx, Modal, Spinner, useToast } from '../lib/ui';

type Account = { id: number; type: string; nickname: string; faceimg: string; addtime: string };
type Payload = { items: Account[]; bindings: { puddingchat: boolean; qq: boolean; wx: boolean; alipay: boolean } };

const CHANNELS: Array<{ key: string; label: string; icon: IconName; tone: string; desc: string }> = [
  { key: 'puddingchat', label: 'PuddingChat', icon: 'sparkle', tone: 'from-lilac-400/22 to-lilac-400/0', desc: '使用 PuddingChat 账号登录' },
  { key: 'qq', label: 'QQ', icon: 'qq', tone: 'from-sky/22 to-sky/0', desc: '使用 QQ 账号快速登录' },
  { key: 'wx', label: '微信', icon: 'wechat', tone: 'from-mint/22 to-mint/0', desc: '使用微信扫码登录' },
  { key: 'alipay', label: '支付宝', icon: 'alipay', tone: 'from-orange/22 to-orange/0', desc: '使用支付宝账号登录' },
];

export default function AccountsPage({ site }: { site: Site }) {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [confirm, setConfirm] = useState<Account | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    get<Payload>('accounts').then((res) => {
      if (res.code === 0 && res.data) setData(res.data);
      else toast.push('error', res.msg || '加载失败');
      setLoading(false);
    });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const enabled = (key: string) => site.types.some((t) => t.enabled && (t.type === key || (key === 'wx' && t.type === 'wechat')));

  const bind = async (key: string) => {
    if (busy) return;
    setBusy(key);
    const res = await post<{ url: string }>('connect', { type: key, bind: 1 });
    if (res.code === 0 && res.data && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setBusy('');
    toast.push('error', res.msg || '发起授权失败');
  };

  const doUnbind = async () => {
    if (!confirm) return;
    setBusy('unbind');
    const res = await post('account.delete', { id: confirm.id });
    setBusy('');
    setConfirm(null);
    if (res.code === 0) {
      toast.push('success', res.msg || '已解除绑定');
      load();
    } else {
      toast.push('error', res.msg || '解绑失败');
    }
  };

  const items = data?.items ?? [];
  const bindings = data?.bindings ?? { puddingchat: false, qq: false, wx: false, alipay: false };

  return (
    <div className='mx-auto w-full max-w-6xl space-y-6'>
      <section className='rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft'>
        <h1 className='text-xl font-semibold text-cream'>授权账号</h1>
        <p className='mt-1.5 text-sm text-white/45'>绑定第三方账号后，可在登录页一键授权登录 PuddingLogin</p>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        {CHANNELS.filter((c) => enabled(c.key)).map((c) => {
          const bound = bindings[c.key];
          const available = enabled(c.key);
          return (
            <div key={c.key} className='relative overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 p-5 shadow-soft'>
              <div className={cx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50', c.tone)} />
              <div className='relative flex items-start justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-ink-950/60 text-cream'>
                  <Icon name={c.icon} size={24} />
                </div>
                <span
                  className={cx(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                    bound ? 'border-mint/30 bg-mint/10 text-mint' : 'border-white/15 bg-white/5 text-white/40'
                  )}
                >
                  {bound ? '已绑定' : '未绑定'}
                </span>
              </div>
              <h2 className='relative mt-4 text-base font-semibold text-cream'>{c.label}</h2>
              <p className='relative mt-1 text-xs leading-relaxed text-white/45'>{c.desc}</p>
              <button
                type='button'
                onClick={() => bind(c.key)}
                disabled={!available || busy === c.key}
                className={cx(
                  'relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
                  available
                    ? 'bg-pudding-gradient text-on-pudding hover:brightness-105 active:scale-[0.98]'
                    : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/30'
                )}
              >
                {busy === c.key ? <Spinner size={14} /> : <Icon name='external' size={14} />}
                {available ? (bound ? '重新授权' : '立即绑定') : '管理员未配置'}
              </button>
            </div>
          );
        })}
      </section>

      <section className='rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
        <div className='flex items-center justify-between border-b border-white/8 px-6 py-5'>
          <h2 className='text-base font-semibold text-cream'>已授权记录</h2>
          {loading ? <Spinner size={16} /> : <span className='text-xs text-white/35'>共 {items.length} 条</span>}
        </div>
        {loading ? (
          <div className='flex items-center justify-center gap-3 py-16 text-sm text-white/40'>
            <Spinner size={18} />
            正在加载…
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-white/30'>
              <Icon name='accounts' size={22} />
            </div>
            <p className='text-sm text-white/35'>还没有授权记录，绑定第三方账号后会显示在这里</p>
          </div>
        ) : (
          <ul className='divide-y divide-white/8'>
            {items.map((a) => (
              <li key={a.id} className='flex items-center gap-4 px-6 py-4'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-cream'>
                  {a.faceimg ? (
                    <img src={a.faceimg} alt={a.nickname} className='h-full w-full object-cover' referrerPolicy='no-referrer' />
                  ) : (
                    <Icon name={a.type === 'qq' ? 'qq' : a.type === 'wx' ? 'wechat' : 'alipay'} size={18} />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-cream/90'>{a.nickname || '未获取昵称'}</p>
                  <p className='mt-0.5 text-[11px] text-white/35'>
                    {a.type === 'puddingchat' ? 'PuddingChat' : a.type === 'qq' ? 'QQ' : a.type === 'wx' ? '微信' : '支付宝'} · 绑定于 {a.addtime}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => setConfirm(a)}
                  className='shrink-0 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20'
                >
                  解除绑定
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title='解除绑定'
        subtitle='解绑后将无法使用该账号一键登录'
        width='max-w-md'
        footer={
          <>
            <button
              type='button'
              onClick={() => setConfirm(null)}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              取消
            </button>
            <button
              type='button'
              onClick={doUnbind}
              disabled={busy === 'unbind'}
              className='inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60'
            >
              {busy === 'unbind' ? <Spinner size={14} /> : <Icon name='trash' size={14} />}
              确认解绑
            </button>
          </>
        }
      >
        <p className='text-sm leading-relaxed text-white/60'>
          确认解除 {confirm?.nickname || '该账号'} 的绑定？解绑后如需再次使用，需要重新发起授权。
        </p>
      </Modal>
    </div>
  );
}
