import { useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';
import { get, post, socialLabel, type Site, type User, type LoginType } from '../lib/api';
import { Spinner, cx, useToast } from '../lib/ui';

type Mode = 'login' | 'register' | 'findpwd';

type CaptchaGetData = {
  enabled: boolean;
  captchaKey?: string;
  type?: string;
  image?: string;
  templateImage?: string;
  width?: number;
  height?: number;
  expireSeconds?: number;
  mode?: string;
  accessKey?: string;
  apiUrl?: string;
  error?: string;
};

const CAPTCHA_WIDGET_SRC = 'https://captcha.idcbdy.com/assets/js/captcha-widget.js';

// 官方组件在脚本顶层用 const 声明，不挂到 window，需要借助 Function 读取全局词法绑定
function getCaptchaWidget(): any {
  try {
    return new Function('return typeof CaptchaWidget !== "undefined" ? CaptchaWidget : null')();
  } catch (e) {
    return null;
  }
}

let captchaWidgetPromise: Promise<any> | null = null;

function loadCaptchaWidget(): Promise<any> {
  const ready = getCaptchaWidget();
  if (ready) return Promise.resolve(ready);
  if (captchaWidgetPromise) return captchaWidgetPromise;
  captchaWidgetPromise = new Promise((resolve, reject) => {
    const ID = 'bdy-captcha-widget';
    let settled = false;
    const finish = (ok: boolean, err?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (ok) {
        const w = getCaptchaWidget();
        if (w) {
          resolve(w);
          return;
        }
      }
      captchaWidgetPromise = null;
      reject(new Error(err || '组件不可用'));
    };
    // 脚本被浏览器扩展或网络策略拦截时 onerror 不一定触发，必须自带超时兜底
    const timer = window.setTimeout(() => finish(false, '组件加载超时'), 3000);
    const probe = () => {
      const w = getCaptchaWidget();
      if (w) finish(true);
      else finish(false, '组件不可用');
    };
    const exist = document.getElementById(ID) as HTMLScriptElement | null;
    if (exist) {
      exist.addEventListener('load', probe, { once: true });
      exist.addEventListener('error', () => finish(false, '组件加载失败'), { once: true });
      // 已存在但可能早就加载完成或加载失败，立即探测一次
      window.setTimeout(probe, 30);
      return;
    }
    const s = document.createElement('script');
    s.id = ID;
    s.src = CAPTCHA_WIDGET_SRC;
    s.async = true;
    s.onload = probe;
    s.onerror = () => finish(false, '组件加载失败');
    document.head.appendChild(s);
  });
  return captchaWidgetPromise;
}

const FEATURES = [
  { icon: 'shield' as const, title: '安全会话', desc: 'HttpOnly 会话 + CSRF 双校验，密码使用 bcrypt 存储' },
  { icon: 'sparkle' as const, title: '一键聚合', desc: 'QQ、微信、支付宝扫码即登录，接入方只需三个参数' },
  { icon: 'code' as const, title: '标准协议', desc: '沿用 connect.php 授权码模式，老系统零改造接入' },
];

export default function AuthPage({
  site,
  mode,
  query,
  onMode,
  onSuccess,
}: {
  site: Site;
  mode: Mode;
  query: URLSearchParams;
  onMode: (m: Mode) => void;
  onSuccess: (u: User) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  const [username, setUsername] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>(site.reg_channel === 'phone' ? 'phone' : 'email');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [password2, setPassword2] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [demoCode, setDemoCode] = useState('');
  const timer = useRef<number | null>(null);
  // 快捷登录未绑定账号时，后端会带票据跳到注册页，注册成功后自动完成绑定
  const [oauthTicket, setOauthTicket] = useState('');
  const [oauthType, setOauthType] = useState('');
  const [oauthNickname, setOauthNickname] = useState('');

  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaType, setCaptchaType] = useState('slider');
  const [captchaMode, setCaptchaMode] = useState('popup');
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [captchaSlider, setCaptchaSlider] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaPending, setCaptchaPending] = useState<(() => void) | null>(null);
  const captchaHostRef = useRef<HTMLDivElement | null>(null);
  const captchaPendingRef = useRef<(() => void) | null>(null);
  const captchaCurRef = useRef<CaptchaGetData | null>(null);

  useEffect(() => {
    const err = query.get('error');
    if (err) {
      setError(err);
      window.history.replaceState(null, '', window.location.pathname + '#/login');
    }
  }, [query]);

  useEffect(() => {
    if (query.get('oauth') !== '1') return;
    const ticket = query.get('ticket') || '';
    const type = query.get('type') || '';
    const nickname = query.get('nickname') || '';
    if (!ticket || !type) {
      setError('快捷登录凭据缺失，请返回登录页重新授权');
      return;
    }
    setOauthTicket(ticket);
    setOauthType(type);
    setOauthNickname(nickname);
  }, [query]);

  useEffect(() => {
    if (countdown <= 0) return;
    timer.current = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [countdown]);

  useEffect(() => {
    setError('');
    setDemoCode('');
  }, [mode]);

  const socials = useMemo(() => {
    const quick = site.quick || { puddingchat: false, qq: false, wx: false, alipay: false };
    return (site.types || []).filter((t) => {
      if (!t.enabled) return false;
      const k = t.type as keyof typeof quick;
      // 四个快捷登录渠道严格按后台开关过滤，未开启即不展示
      return k in quick ? !!quick[k] : false;
    });
  }, [site.types, site.quick]);

  useEffect(() => {
    return () => {
      const ov = document.querySelector('[data-pl-captcha]');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    };
  }, []);

  function closeOfficialCaptcha(delay = 0): void {
    window.setTimeout(() => {
      const host = captchaHostRef.current;
      if (!host) return;
      const ov = (host as any)._popupOverlay;
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      if (host.parentNode) host.parentNode.removeChild(host);
      captchaHostRef.current = null;
    }, delay);
  }

  async function openOfficialCaptcha(data: CaptchaGetData): Promise<boolean> {
    try {
      const widget = await loadCaptchaWidget();
      if (!widget || typeof widget.render !== 'function') return false;
      // 自建遮罩：官方组件以 inline 模式渲染进卡片，避免依赖组件自带弹层与自动点击
      const prevOverlay = document.querySelector('[data-pl-captcha]');
      if (prevOverlay && prevOverlay.parentNode) prevOverlay.parentNode.removeChild(prevOverlay);
      const overlay = document.createElement('div');
      overlay.setAttribute('data-pl-captcha', '1');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:16px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;';
      const card = document.createElement('div');
      card.style.cssText = 'position:relative;width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow-y:auto;background:#fff;border-radius:18px;box-shadow:0 24px 64px rgba(15,23,42,.28);padding:22px 22px 18px;box-sizing:border-box;';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', '关闭验证码');
      closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;width:30px;height:30px;border:0;border-radius:50%;background:#f1f5f9;color:#94a3b8;font-size:18px;line-height:1;cursor:pointer;';
      const cancel = () => {
        closeOfficialCaptcha();
        captchaPendingRef.current = null;
        setCaptchaPending(null);
      };
      closeBtn.addEventListener('click', cancel);
      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) cancel();
      });
      const titleEl = document.createElement('div');
      titleEl.textContent = '安全验证';
      titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#0f172a;margin:0 34px 4px 0;';
      const tipEl = document.createElement('div');
      tipEl.textContent = '请完成下方人机验证以继续';
      tipEl.style.cssText = 'font-size:12.5px;color:#94a3b8;margin-bottom:14px;';
      const box = document.createElement('div');
      box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;';
      card.appendChild(closeBtn);
      card.appendChild(titleEl);
      card.appendChild(tipEl);
      card.appendChild(box);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      const host = box;
      captchaHostRef.current = overlay;

      const onPass = () => {
        closeOfficialCaptcha(400);
        const p = captchaPendingRef.current;
        captchaPendingRef.current = null;
        setCaptchaPending(null);
        p?.();
      };

      const opts: any = {
        mode: 'inline',
        accessKey: data.accessKey || '',
        triggerText: '点击完成安全验证',
        onSubmit: (vd: string, done: (passed: boolean) => void) => {
          const cur = captchaCurRef.current;
          post('captcha.check', { captchaKey: (cur && cur.captchaKey) || '', verifyData: vd })
            .then((r: any) => {
              const passed = r.code === 0;
              done(passed);
              if (passed) {
                toast.push('success', '验证通过');
                onPass();
              } else {
                toast.push('error', r.msg || '验证未通过，请重试');
              }
            })
            .catch(() => done(false));
        },
        onReset: () => {
          get<CaptchaGetData>('captcha.get').then((r) => {
            if (r.code === 0 && r.data?.enabled) {
              captchaCurRef.current = r.data;
              widget.render(host, r.data, opts);
            }
          });
        },
      };

      widget.render(host, data, opts);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function captchaInit(then: () => void) {
    if (captchaBusy) return;
    setCaptchaBusy(true);
    setCaptchaInput('');
    setCaptchaSlider(0);
    const res = await get<CaptchaGetData>('captcha.get');
    setCaptchaBusy(false);
    if (res.code !== 0 || !res.data?.enabled) {
      then();
      return;
    }
    if (res.data.error) {
      setError(res.data.error);
      toast.push('error', res.data.error);
      return;
    }
    const d = res.data;
    captchaPendingRef.current = then;
    setCaptchaPending(() => then);
    captchaCurRef.current = d;
    const opened = await openOfficialCaptcha(d);
    if (opened) return;
    setCaptchaKey(d.captchaKey || '');
    setCaptchaImage(d.image || '');
    setCaptchaType(d.type || 'char');
    setCaptchaMode(d.mode || 'popup');
    setCaptchaOpen(true);
  }

  async function captchaSubmit() {
    if (!captchaKey || captchaBusy) return;
    let verifyData = '';
    const t = captchaType;
    if (['slider', 'rotate', 'curve_slider', 'mask_slider', 'gear_rotate', 'rope'].includes(t)) {
      verifyData = String(captchaSlider);
    } else if (['char', 'math', 'cnchar', 'mirror_text', 'mirror_digit', 'dynamic_char', 'click_order', 'icon_click', 'text_order', 'clock', 'shape_fix', 'audio', 'morse', 'calendar', 'counting', 'block_count', 'color_temp', 'water_temp', 'dial'].includes(t)) {
      verifyData = captchaInput.trim();
    } else {
      verifyData = captchaInput.trim() || String(captchaSlider);
    }
    if (!verifyData) { toast!.push('error', '请完成验证码操作'); return; }
    setCaptchaBusy(true);
    const res = await post('captcha.check', { captchaKey, verifyData });
    setCaptchaBusy(false);
    if (res.code === 0) {
      setCaptchaOpen(false);
      setCaptchaKey('');
      captchaPending?.();
      setCaptchaPending(null);
    } else {
      toast!.push('error', res.msg || '验证码错误，请重试');
      captchaInit(captchaPending!);
    }
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!account.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    // 登录图形验证码仅在后台开启时启用，关闭时无感直接提交
    if (site.captcha_open_login) {
      captchaInit(doLoginSubmit);
      return;
    }
    doLoginSubmit();
  }
  async function doLoginSubmit() {
    if (busy) return;
    setBusy(true);
    const res = await post<{ user: User }>('login', { user: account.trim(), pass: password });
    setBusy(false);
    if (res.code === 0 && res.data?.user) {
      onSuccess(res.data.user);
    } else {
      setError(res.msg || '登录失败');
    }
  }

  async function sendCode() {
    if (countdown > 0 || busy) return;
    if (!target.trim()) {
      setError(channel === 'email' ? '请先填写邮箱' : '请先填写手机号');
      return;
    }
    setError('');
    captchaInit(doSendCode);
  }

  async function doSendCode() {
    setBusy(true);
    const res = await post<{ debug_code?: string | null; message: string }>('sendcode', {
      channel,
      purpose: mode === 'findpwd' ? 'reset' : 'register',
      target: target.trim(),
    });
    setBusy(false);
    if (res.code === 0) {
      setCountdown(60);
      if (res.data?.debug_code) {
        setDemoCode(res.data.debug_code);
        toast.push('info', '演示模式验证码：' + res.data.debug_code);
      } else {
        toast.push('success', res.data?.message || '验证码已发送');
      }
    } else {
      setError(res.msg || '发送失败');
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!target.trim()) {
      setError(channel === 'email' ? '请输入邮箱' : '请输入手机号');
      return;
    }
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setBusy(true);
    const body: Record<string, string> = {
      username: username.trim(),
      password,
      password2,
      code: code.trim(),
    };
    if (channel === 'email') body.email = target.trim();
    else body.phone = target.trim();
    // 快捷登录转注册：带上票据，注册成功后由后端自动绑定该第三方账号
    if (oauthTicket) body.oauth_ticket = oauthTicket;
    const res = await post<{ user: User }>('reg', body);
    setBusy(false);
    if (res.code === 0 && res.data?.user) {
      setOauthTicket('');
      toast.push('success', oauthTicket ? '注册成功，已绑定快捷登录并自动登录' : '注册成功，已自动登录');
      onSuccess(res.data.user);
    } else {
      setError(res.msg || '注册失败');
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!target.trim()) {
      setError(channel === 'email' ? '请输入邮箱' : '请输入手机号');
      return;
    }
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }
    if (password.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    setBusy(true);
    const res = await post<{ username: string }>('findpwd', {
      channel,
      target: target.trim(),
      code: code.trim(),
      password,
      password2,
    });
    setBusy(false);
    if (res.code === 0) {
      toast.push('success', '密码已重置，请使用新密码登录');
      setAccount(res.data?.username || '');
      setPassword('');
      setCode('');
      onMode('login');
    } else {
      setError(res.msg || '重置失败');
    }
  }

  async function socialLogin(t: LoginType) {
    if (busy) return;
    setError('');
    setBusy(true);
    const res = await post<{ url: string }>('connect', { type: t.type, bind: 1 });
    setBusy(false);
    if (res.code === 0 && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setError(res.msg || '该登录方式暂不可用');
    }
  }

  const title = mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账号' : '重置密码';
  const subtitle =
    mode === 'login' ? '登录 PuddingLogin，管理你的应用与授权账号' : mode === 'register' ? '注册后即可创建应用、接入聚合登录' : '通过邮箱或手机验证码找回密码';

  return (
    <div className='relative flex min-h-screen flex-col overflow-hidden bg-ink-900'>
      <div className='pointer-events-none absolute inset-0 bg-mesh opacity-90' />
      <div className='pointer-events-none absolute inset-0 grid-noise' />
      <div className='absolute right-4 top-4 z-20 sm:right-6 sm:top-6'>
        <ThemeToggle />
      </div>
      <div className='pl-ambient-glow pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-pudding-500/20 blur-3xl animate-float' />
      <div className='pl-ambient-glow pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-lilac-500/20 blur-3xl animate-float' style={{ animationDelay: '1.8s' }} />

      <div className='relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8'>
        <section className='order-2 flex-1 lg:order-1'>
          <div className='mb-10 flex items-center gap-3 lg:mb-14'>
            <img src={site.logo_path || '/logo.png'} alt={site.sitename} className='h-11 w-11 rounded-2xl object-contain shadow-glow' />
            <div>
              <div className='text-[17px] font-semibold tracking-tight text-cream'>PuddingLogin</div>
              <div className='text-[11px] uppercase tracking-[0.22em] text-white/35'>Unified Auth Platform</div>
            </div>
          </div>

          <h1 className='max-w-xl text-[30px] font-semibold leading-[1.25] tracking-tight text-cream sm:text-[38px]'>
            一次接入，
            <span className='gradient-text'>聚合所有社交登录</span>
          </h1>
          <p className='mt-4 max-w-md text-[15px] leading-relaxed text-white/50'>
            {site.description || '为你的站点提供 QQ、微信、支付宝等第三方账号登录能力，统一授权、统一回调、统一用户标识。'}
          </p>

          <div className='mt-9 grid max-w-lg gap-3 sm:grid-cols-3'>
            {FEATURES.map((f) => (
              <div key={f.title} className='rounded-2xl border border-white/8 bg-white/[0.035] p-4 backdrop-blur-sm'>
                <div className='mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-pudding-300'>
                  <Icon name={f.icon} size={16} />
                </div>
                <div className='text-[13px] font-semibold text-cream/90'>{f.title}</div>
                <div className='mt-1 text-[12px] leading-relaxed text-white/38'>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className='order-1 flex w-full flex-col lg:order-2 lg:w-[420px] lg:shrink-0'>
          <div className='glass-strong animate-fade-up p-6 sm:p-7'>
            <div className='mb-6'>
              <h2 className='text-[22px] font-semibold tracking-tight text-cream'>{title}</h2>
              <p className='mt-1.5 text-[13px] text-white/45'>{subtitle}</p>
            </div>

            <div className='mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-white/8 bg-ink-950/50 p-1'>
              {(['login', 'register', 'findpwd'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type='button'
                  onClick={() => onMode(m)}
                  disabled={m === 'register' && !site.reg_open}
                  className={cx(
                    'rounded-xl px-2 py-2 text-[13px] font-medium transition disabled:opacity-35',
                    mode === m ? 'bg-white/10 text-cream shadow-soft' : 'text-white/45 hover:text-white/75'
                  )}
                >
                  {m === 'login' ? '登录' : m === 'register' ? '注册' : '找回密码'}
                </button>
              ))}
            </div>

            {error ? (
              <div className='mb-4 flex items-start gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] leading-relaxed text-red-200'>
                <Icon name='close' size={15} className='mt-0.5 shrink-0' />
                <span>{error}</span>
              </div>
            ) : null}

            {mode === 'login' ? (
              <form onSubmit={doLogin} className='space-y-4'>
                <div>
                  <label className='label'>账号</label>
                  <div className='relative'>
                    <div className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30'>
                      <Icon name='user' size={17} />
                    </div>
                    <input
                      className='field pl-11'
                      placeholder='用户名 / 邮箱 / 手机号'
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      autoComplete='username'
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className='label'>密码</label>
                  <div className='relative'>
                    <div className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30'>
                      <Icon name='lock' size={17} />
                    </div>
                    <input
                      className='field px-11'
                      type={showPwd ? 'text' : 'password'}
                      placeholder='请输入登录密码'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete='current-password'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPwd((v) => !v)}
                      className='absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-2 text-white/35 transition hover:text-white/70'
                      aria-label='切换密码可见'
                    >
                      <Icon name={showPwd ? 'eye-off' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>
                <button type='submit' className='btn-primary w-full' disabled={busy}>
                  {busy ? <Spinner /> : <Icon name='arrow-right' size={17} />}
                  <span>{busy ? '登录中…' : '登录'}</span>
                </button>
              </form>
            ) : null}

            {mode === 'register' ? (
              <form onSubmit={doRegister} className='space-y-3.5'>
                {oauthTicket ? (
                  <div className='flex items-start gap-2 rounded-2xl border border-pudding-300/25 bg-pudding-300/10 px-4 py-3 text-[13px] leading-relaxed text-pudding-200'>
                    <Icon name='sparkle' size={15} className='mt-0.5 shrink-0' />
                    <span>
                      你正在使用 {socialLabel(oauthType)} 快捷登录{oauthNickname ? '（' + oauthNickname + '）' : ''}，该账号尚未绑定本站用户。
                      完成下方注册后将自动绑定，下次可直接快捷登录。
                    </span>
                  </div>
                ) : null}
                <div>
                  <label className='label'>用户名</label>
                  <input
                    className='field'
                    placeholder='3-32 位，不含空格与 @ 等符号'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete='username'
                  />
                </div>
                <div>
                  <div className='mb-2 flex items-center justify-between'>
                    <label className='text-[13px] font-medium tracking-wide text-white/55'>
                      {channel === 'email' ? '邮箱' : '手机号'}
                    </label>
                    {site.reg_channel === 'both' ? (
                    <div className='flex gap-1 rounded-lg border border-white/8 bg-ink-950/60 p-0.5'>
                      <button
                        type='button'
                        onClick={() => setChannel('email')}
                        className={cx('rounded-md px-2 py-0.5 text-[11px]', channel === 'email' ? 'bg-white/10 text-cream' : 'text-white/40')}
                      >
                        邮箱
                      </button>
                      <button
                        type='button'
                        onClick={() => setChannel('phone')}
                        className={cx('rounded-md px-2 py-0.5 text-[11px]', channel === 'phone' ? 'bg-white/10 text-cream' : 'text-white/40')}
                      >
                        手机
                      </button>
                    </div>
                    ) : null}
                  </div>
                  <div className='relative'>
                    <div className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30'>
                      <Icon name={channel === 'email' ? 'mail' : 'phone'} size={17} />
                    </div>
                    <input
                      className='field pl-11'
                      placeholder={channel === 'email' ? 'you@example.com' : '11 位手机号'}
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className='label'>验证码</label>
                  <div className='flex gap-2'>
                    <input
                      className='field flex-1 tracking-[0.3em]'
                      placeholder='6 位数字'
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode='numeric'
                    />
                    <button
                      type='button'
                      onClick={sendCode}
                      disabled={countdown > 0 || busy}
                      className='btn-ghost w-[104px] shrink-0 px-3 text-[13px]'
                    >
                      {countdown > 0 ? countdown + 's' : '获取验证码'}
                    </button>
                  </div>
                  {demoCode ? (
                    <p className='mt-1.5 text-[12px] text-pudding-300'>演示模式验证码：{demoCode}</p>
                  ) : null}
                </div>
                <div>
                  <label className='label'>密码</label>
                  <input
                    className='field'
                    type='password'
                    placeholder='至少 6 位，不能是纯数字'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='new-password'
                  />
                </div>
                <div>
                  <label className='label'>确认密码</label>
                  <input
                    className='field'
                    type='password'
                    placeholder='再次输入密码'
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    autoComplete='new-password'
                  />
                </div>
                <button type='submit' className='btn-primary w-full' disabled={busy}>
                  {busy ? <Spinner /> : <Icon name='sparkle' size={17} />}
                  <span>{busy ? '提交中…' : '注册并登录'}</span>
                </button>
              </form>
            ) : null}

            {mode === 'findpwd' ? (
              <form onSubmit={doReset} className='space-y-3.5'>
                <div>
                  <div className='mb-2 flex items-center justify-between'>
                    <label className='text-[13px] font-medium tracking-wide text-white/55'>
                      {channel === 'email' ? '注册邮箱' : '注册手机号'}
                    </label>
                    {site.reg_channel === 'both' ? (
                    <div className='flex gap-1 rounded-lg border border-white/8 bg-ink-950/60 p-0.5'>
                      <button
                        type='button'
                        onClick={() => setChannel('email')}
                        className={cx('rounded-md px-2 py-0.5 text-[11px]', channel === 'email' ? 'bg-white/10 text-cream' : 'text-white/40')}
                      >
                        邮箱
                      </button>
                      <button
                        type='button'
                        onClick={() => setChannel('phone')}
                        className={cx('rounded-md px-2 py-0.5 text-[11px]', channel === 'phone' ? 'bg-white/10 text-cream' : 'text-white/40')}
                      >
                        手机
                      </button>
                    </div>
                    ) : null}
                  </div>
                  <input
                    className='field'
                    placeholder={channel === 'email' ? 'you@example.com' : '11 位手机号'}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
                <div>
                  <label className='label'>验证码</label>
                  <div className='flex gap-2'>
                    <input
                      className='field flex-1 tracking-[0.3em]'
                      placeholder='6 位数字'
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode='numeric'
                    />
                    <button
                      type='button'
                      onClick={sendCode}
                      disabled={countdown > 0 || busy}
                      className='btn-ghost w-[104px] shrink-0 px-3 text-[13px]'
                    >
                      {countdown > 0 ? countdown + 's' : '获取验证码'}
                    </button>
                  </div>
                  {demoCode ? (
                    <p className='mt-1.5 text-[12px] text-pudding-300'>演示模式验证码：{demoCode}</p>
                  ) : null}
                </div>
                <div>
                  <label className='label'>新密码</label>
                  <input
                    className='field'
                    type='password'
                    placeholder='至少 6 位，不能是纯数字'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='new-password'
                  />
                </div>
                <div>
                  <label className='label'>确认新密码</label>
                  <input
                    className='field'
                    type='password'
                    placeholder='再次输入新密码'
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    autoComplete='new-password'
                  />
                </div>
                <button type='submit' className='btn-primary w-full' disabled={busy}>
                  {busy ? <Spinner /> : <Icon name='refresh' size={17} />}
                  <span>{busy ? '提交中…' : '重置密码'}</span>
                </button>
              </form>
            ) : null}

            {mode === 'login' && socials.length > 0 ? (
              <>
                <div className='my-5 flex items-center gap-3'>
                  <div className='divider' />
                  <span className='shrink-0 text-[11px] uppercase tracking-[0.18em] text-white/30'>或</span>
                  <div className='divider' />
                </div>
                <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3'>
                  {socials.map((t) => (
                    <button
                      key={t.type}
                      type='button'
                      onClick={() => socialLogin(t)}
                      disabled={busy}
                      className='btn-ghost px-3'
                      style={{ color: t.color }}
                    >
                      <Icon name={(t.icon || t.type) as IconName} size={19} />
                      <span className='truncate text-[13px]'>{t.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

        </section>
      </div>

      <footer className='relative z-10 px-5 pb-5 pt-2 text-center text-[12px] leading-relaxed text-white/30'>
        {site.footer ? <p className='text-white/40'>{site.footer}</p> : null}
        <p className='mt-0.5'>
          © {new Date().getFullYear()} {site.sitename || 'PuddingLogin'} · v{site.version}
          {site.kfqq ? ' · 客服 QQ ' + site.kfqq : ''}
          {site.kfemail ? ' · 客服邮箱 ' + site.kfemail : ''}
        </p>
        {site.icp ? (
          <p className='mt-0.5'>
            {site.icp.split('|').map((part, i) => {
              const text = part.trim();
              if (!text) return null;
              const isPolice = text.indexOf('公网安备') >= 0;
              return (
                <span key={i}>
                  {i > 0 ? <span className='mx-1.5 text-white/20'>|</span> : null}
                  <a
                    href={isPolice ? 'https://beian.mps.gov.cn/' : 'https://beian.miit.gov.cn/'}
                    target='_blank'
                    rel='noreferrer noopener'
                    className='transition-colors hover:text-pudding-300'
                  >
                    {text}
                  </a>
                </span>
              );
            })}
          </p>
        ) : null}
      </footer>

      {captchaOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm' onClick={(e) => { if (e.target === e.currentTarget) setCaptchaOpen(false); }}>
          <div className='glass-strong mx-4 w-full max-w-sm animate-fade-up p-6'>
            <h3 className='text-lg font-semibold text-cream'>安全验证</h3>
            <p className='mt-1 text-[13px] text-white/45'>请完成下方人机验证以继续</p>
            {captchaImage ? (
              <div className='mt-4 overflow-hidden rounded-xl border border-white/10'>
                <img src={captchaImage} alt='验证码' className='w-full' referrerPolicy='no-referrer' />
              </div>
            ) : null}
            {['slider', 'rotate', 'curve_slider', 'mask_slider', 'gear_rotate', 'rope'].includes(captchaType) ? (
              <div className='mt-4'>
                <input type='range' min='0' max='100' value={Math.round(captchaSlider * 100)} onChange={(e) => setCaptchaSlider(parseInt(e.target.value) / 100)} className='w-full accent-pudding-300' />
                <p className='mt-1 text-center text-[12px] text-white/40'>滑动比例：{Math.round(captchaSlider * 100)}%</p>
              </div>
            ) : null}
            {['char', 'math', 'cnchar', 'mirror_text', 'mirror_digit', 'dynamic_char', 'click_order', 'icon_click', 'text_order', 'clock', 'shape_fix', 'audio', 'morse', 'calendar', 'counting', 'block_count', 'color_temp', 'water_temp', 'dial'].includes(captchaType) ? (
              <div className='mt-4'>
                <input type='text' value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder='请输入验证结果' className='field' autoFocus />
              </div>
            ) : null}
            {['pipe', 'wire', 'pulse', 'sort_part', 'prism', 'ballistic', 'claw', 'shape_dock', 'draw_trail', 'grid_cover'].includes(captchaType) ? (
              <div className='mt-4'>
                <input type='text' value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder='请输入验证结果或交互数据' className='field' autoFocus />
                <p className='mt-1.5 text-center text-[12px] text-white/40'>该类型需图形交互，可将结果填入上方输入框</p>
              </div>
            ) : null}
            {captchaType === 'sense' ? (
              <p className='mt-4 text-center text-[12px] text-white/45'>无感验证将自动采集行为数据，直接点击下方「验证」即可</p>
            ) : null}
            <div className='mt-5 flex gap-3'>
              <button type='button' onClick={() => { setCaptchaOpen(false); setCaptchaKey(''); setCaptchaPending(null); }} className='btn-ghost flex-1'>取消</button>
              <button type='button' onClick={captchaSubmit} disabled={captchaBusy} className='btn-primary flex-1'>{captchaBusy ? <Spinner size={14} /> : '验证'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
