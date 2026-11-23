import { useMemo, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';
import { post, type Site } from '../lib/api';
import { cx, useToast } from '../lib/ui';
export default function TestPage({
  site,
  onBack,
  embedded = false,
}: {
  site: Site;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const types = useMemo(() => {
    const list = (site.types || []).filter((t) => t.configured || t.mode === 'system');
    return list.length > 0 ? list : (site.types || []);
  }, [site.types]);
  async function go(t: { type: string; name: string }) {
    if (busy) return;
    setBusy(t.type);
    const res = await post<{ url: string }>('connect', { type: t.type, bind: 0 });
    setBusy('');
    if (res.code === 0 && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    toast.push('error', res.msg || '该登录方式暂不可用，请先在后台配置密钥');
  }
  const panel = (
    <section className='w-full overflow-hidden rounded-2xl border border-white/12 bg-ink-850/80 shadow-soft'>
      <div className='border-b border-white/8 px-6 py-4'>
        <p className='text-[15px] font-semibold text-cream'>请选择一种登录方式：</p>
        <p className='mt-1 text-[12px] text-white/40'>点击按钮将跳转至对应平台完成真实授权，用于验证接口配置是否可用</p>
      </div>
      {types.length === 0 ? (
        <div className='px-6 py-16 text-center text-sm text-white/40'>暂无可测试的登录方式，请先在后台开启登录接口</div>
      ) : (
        <div className='grid grid-cols-2 gap-2.5 px-6 py-6 sm:grid-cols-3 md:grid-cols-5'>
          {types.map((t) => (
            <button
              key={t.type}
              type='button'
              onClick={() => go(t)}
              disabled={busy !== ''}
              className={cx(
                'flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-55',
                busy === t.type && 'opacity-55'
              )}
              style={{ color: t.color }}
            >
              <Icon name={(t.icon || t.type) as IconName} size={19} />
              <span className='truncate text-[13px]'>{t.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className='border-t border-white/8 px-6 py-3.5 text-center text-[12px] text-white/30'>
        {site.sitename} © {new Date().getFullYear()} All Rights Reserved.
      </div>
    </section>
  );
  if (embedded) {
    return (
      <div className='mx-auto w-full max-w-4xl'>
        <div className='mb-4 flex items-end justify-between gap-3'>
          <div>
            <h2 className='text-[16px] font-semibold text-cream'>登录接口测试</h2>
            <p className='mt-1 text-[12px] text-white/40'>点击下方任意平台将跳转至真实授权页，用于验证登录接口配置是否可用</p>
          </div>
          <span className='shrink-0 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-white/45'>
            共 {types.length} 个可用方式
          </span>
        </div>
        {panel}
      </div>
    );
  }
  return (
    <div className='relative flex min-h-screen flex-col bg-ink-900'>
      <header className='flex items-center justify-between px-5 py-4 sm:px-8'>
        <h1 className='text-[15px] font-semibold text-cream'>{site.sitename} - 接口测试</h1>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => onBack?.()}
            className='rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs text-white/65 transition hover:bg-white/10 hover:text-white'
          >
            返回首页
          </button>
          <ThemeToggle />
        </div>
      </header>
      <main className='flex flex-1 items-start justify-center px-5 py-6'>
        <div className='w-full max-w-4xl'>{panel}</div>
      </main>
    </div>
  );
}

