import { useState, type FormEvent } from 'react';
import Icon from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';
import { post, type Site, type User } from '../lib/api';
import { cx, Field, Spinner } from '../lib/ui';

export default function AdminLoginPage({
  site,
  onSuccess,
  onBack,
}: {
  site: Site;
  onSuccess: (u: User) => void;
  onBack: () => void;
}) {
  const [account, setAccount] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr('');
    if (!account.trim() || !pass) {
      setErr('请输入管理员账号与密码');
      return;
    }
    setBusy(true);
    const res = await post<{ user: User; csrf_token: string }>('login', {
      user: account.trim(),
      pass,
    });
    setBusy(false);
    if (res.code !== 0 || !res.data || !res.data.user) {
      setErr(res.msg || '登录失败，请稍后重试');
      return;
    }
    if (!res.data.user.is_admin) {
      await post('logout');
      setErr('该账号不是管理员，无法进入管理后台');
      return;
    }
    onSuccess(res.data.user);
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10'>
      <div className='pointer-events-none absolute inset-0 bg-mesh opacity-50' />
      <div className='pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-berry-500/15 blur-3xl' />
      <div className='pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-pudding-400/15 blur-3xl' />
      <div className='absolute right-4 top-4 z-20 sm:right-6 sm:top-6'>
        <ThemeToggle />
      </div>

      <div className='relative w-full max-w-[420px]'>
        <div className='mb-6 flex flex-col items-center text-center'>
          <img src={site.logo_path || '/logo.png'} alt={site.sitename} className='h-14 w-14 rounded-3xl object-contain shadow-glow' />
          <h1 className='mt-4 text-2xl font-semibold tracking-tight text-cream'>
            PuddingLogin 管理后台
          </h1>
          <p className='mt-1.5 text-[13px] text-white/40'>
            仅限管理员账号登录 · {site.sitename || 'PuddingLogin'}
          </p>
        </div>

        <form
          onSubmit={submit}
          className='rounded-3xl border border-white/10 bg-ink-850/85 p-6 shadow-card backdrop-blur-xl sm:p-7'
        >
          <div className='space-y-4'>
            <Field label='管理员账号' icon={<Icon name='user' size={16} />}>
              <input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder='请输入管理员账号'
                autoComplete='username'
                className='h-12 w-full rounded-2xl border border-white/12 bg-white/5 pl-11 pr-4 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
            </Field>

            <Field label='登录密码' icon={<Icon name='lock' size={16} />}>
              <input
                type={show ? 'text' : 'password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder='请输入登录密码'
                autoComplete='current-password'
                className='h-12 w-full rounded-2xl border border-white/12 bg-white/5 pl-11 pr-11 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
              <button
                type='button'
                onClick={() => setShow((v) => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/35 transition hover:text-white/70'
                aria-label='切换密码可见性'
              >
                <Icon name={show ? 'eye-off' : 'eye'} size={16} />
              </button>
            </Field>
          </div>

          {err ? (
            <div className='mt-4 flex items-start gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-200'>
              <Icon name='close' size={14} className='mt-0.5 shrink-0' />
              <span>{err}</span>
            </div>
          ) : null}

          <button
            type='submit'
            disabled={busy}
            className={cx(
              'mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-pudding-gradient text-sm font-semibold text-on-pudding transition',
              busy ? 'opacity-70' : 'hover:brightness-105'
            )}
          >
            {busy ? <Spinner size={16} /> : <Icon name='shield' size={16} />}
            {busy ? '登录中…' : '进入管理后台'}
          </button>

          <div className='mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-[12.5px]'>
          </div>
        </form>


      </div>
    </div>
  );
}

