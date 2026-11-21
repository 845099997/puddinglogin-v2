import { useCallback, useEffect, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import {
  get,
  post,
  type PlatformAccount,
  type PlatformItem,
  type PlatformLog,
  type PlatformTestResult,
  type Site,
} from '../lib/api';
import { copyText, cx, Spinner, useToast } from '../lib/ui';

type Paged<T> = { items: T[]; total: number; page: number; size: number };

const MODE_LABEL: Record<string, string> = {
  official: '对接官方',
  system: '对接同系统',
  rainbow: '对接彩虹聚合',
};

const MODE_TONE: Record<string, string> = {
  official: 'border-pudding-300/30 bg-pudding-300/10 text-pudding-200',
  system: 'border-lilac-300/30 bg-lilac-300/10 text-lilac-200',
  rainbow: 'border-sky/30 bg-sky/10 text-sky',
};

const MODE_DESC: Record<string, string> = {
  official: '直接向官方开放平台发起 OAuth 授权，需填写该平台的 AppID 与 AppKey',
  system: '与远端部署的同系统实例互通登录，需配置远端 connect.php 地址、AppID 与 AppKey',
  rainbow: '由彩虹聚合登录网关统一代理第三方授权，需配置网关地址、聚合 AppID 与 AppKey',
};

const SUBS: Array<{ key: string; label: string; icon: IconName }> = [
  { key: 'credential', label: '配置密钥', icon: 'lock' },
  { key: 'accounts', label: '账号列表', icon: 'accounts' },
  { key: 'logs', label: '登录记录', icon: 'logs' },
];

const FIELD_CLS =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8';

const ACT_CLS =
  'rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white';

export default function PlatformPage({ site }: { site: Site }) {
  const toast = useToast();
  const [items, setItems] = useState<PlatformItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState('');
  const [detail, setDetail] = useState<PlatformItem | null>(null);
  const [sub, setSub] = useState('credential');
  const [sysConfig, setSysConfig] = useState<{ base: string; appid: string; appkey_set: boolean }>({ base: '', appid: '', appkey_set: false });
  const [rainbowConfig, setRainbowConfig] = useState<{ api: string; appid: string; appkey_set: boolean }>({ api: '', appid: '', appkey_set: false });
  const [probes, setProbes] = useState<Record<string, PlatformTestResult>>({});
  const [probing, setProbing] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    get<{
      items: PlatformItem[];
      total: number;
      opened: number;
      system?: { base: string; appid: string; appkey_set: boolean };
      rainbow?: { api: string; appid: string; appkey_set: boolean };
    }>('platform.list').then((res) => {
      setLoading(false);
      if (res.code === 0 && res.data) {
        setItems(res.data.items);
        if (res.data.system) {
          setSysConfig(res.data.system);
        }
        if (res.data.rainbow) {
          setRainbowConfig(res.data.rainbow);
        }
      } else {
        toast.push('error', res.msg || '接口列表加载失败');
      }
    });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (items.length === 0) return;
    let alive = true;
    (async () => {
      for (const it of items) {
        if (!alive) return;
        setProbing((p) => ({ ...p, [it.type]: true }));
        const res = await get<{ type: string; mode: string; result: PlatformTestResult }>('platform.probe', { type: it.type });
        if (!alive) return;
        setProbing((p) => ({ ...p, [it.type]: false }));
        if (res.code === 0 && res.data) {
          const result = res.data.result;
          setProbes((prev) => ({ ...prev, [it.type]: result }));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  async function probeOne(type: string) {
    setProbing((p) => ({ ...p, [type]: true }));
    const res = await get<{ type: string; mode: string; result: PlatformTestResult }>('platform.probe', { type, force: '1' });
    setProbing((p) => ({ ...p, [type]: false }));
    if (res.code === 0 && res.data) {
      const result = res.data.result;
      setProbes((prev) => ({ ...prev, [type]: result }));
      toast.push(result.ok ? 'success' : 'error', result.ok ? '接口连通正常' : '探测未通过：' + result.detail);
    } else {
      toast.push('error', res.msg || '探测失败');
    }
  }

  function dotOf(it: PlatformItem): { cls: string; label: string; title: string } {
    if (probing[it.type]) return { cls: 'bg-white/25 animate-pulse', label: '探测中', title: '正在探测接口连通性' };
    const pr = probes[it.type];
    if (!pr) return { cls: 'bg-white/20', label: '待探测', title: '尚未完成连通性探测' };
    if (pr.ok) return { cls: 'bg-mint', label: '连通', title: pr.detail };
    if (pr.stage === 'credential') return { cls: 'bg-white/25', label: '未配置', title: pr.detail };
    return { cls: 'bg-berry-400', label: '不通', title: pr.detail };
  }

  async function toggle(it: PlatformItem) {
    setBusyType(it.type);
    const res = await post<{ status: number }>('platform.toggle', { type: it.type });
    setBusyType('');
    if (res.code !== 0) {
      toast.push('error', res.msg || '切换失败');
      return;
    }
    toast.push('success', res.msg || '已切换状态');
    setItems((prev) => prev.map((p) => (p.type === it.type ? { ...p, status: it.status === 1 ? 0 : 1 } : p)));
    setDetail((d) => (d && d.type === it.type ? { ...d, status: it.status === 1 ? 0 : 1 } : d));
  }

  const openedCount = items.filter((i) => i.status === 1).length;

  if (detail) {
    return (
      <PlatformDetail
        item={detail}
        sub={sub}
        onSub={setSub}
        onBack={() => {
          setDetail(null);
          load();
        }}
        onSaved={load}
        sysConfig={sysConfig}
        rainbowConfig={rainbowConfig}
      />
    );
  }

  return (
    <div className='space-y-5'>
      <section className='rounded-3xl border border-white/10 bg-ink-850/70 shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4'>
          <div>
            <h2 className='text-base font-semibold text-cream'>登录接口</h2>
            <p className='mt-1 text-[12px] text-white/40'>
              系统共有 {items.length} 个登录接口，已开启 {openedCount} 个 ·{' '}
              {site.sitename || 'PuddingLogin'}
            </p>
          </div>
          <button
            type='button'
            onClick={load}
            className='inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
          >
            <Icon name='refresh' size={14} />
            刷新接口列表
          </button>
        </div>

        <div className='divide-y divide-white/6'>
          {loading ? (
            <div className='flex items-center justify-center gap-2 py-12 text-sm text-white/40'>
              <Spinner size={16} />
              正在读取接口列表…
            </div>
          ) : items.length === 0 ? (
            <p className='py-12 text-center text-sm text-white/35'>暂无登录接口</p>
          ) : (
            items.map((it) => (
              <div
                key={it.type}
                className='flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 transition hover:bg-white/[0.03]'
              >
                <div className='flex min-w-[168px] flex-1 items-center gap-3'>
                  <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70'>
                    <Icon name={it.icon as IconName} size={18} />
                  </span>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-cream'>{it.type}</p>
                    <p className='truncate text-[11px] text-white/35'>{it.name}</p>
                  </div>
                </div>

                <div className='w-[112px] shrink-0'>
                  <span
                    className={cx(
                      'inline-flex rounded-lg border px-2 py-1 text-[11px]',
                      MODE_TONE[it.mode] || MODE_TONE.official
                    )}
                  >
                    {MODE_LABEL[it.mode] || it.mode}
                  </span>
                </div>

                <div className='flex w-[86px] shrink-0 items-center gap-1.5'>
                  {(() => {
                    const d = dotOf(it);
                    return (
                      <>
                        <span className={cx('h-2 w-2 shrink-0 rounded-full', d.cls)} />
                        <span className='truncate text-[11px] text-white/45' title={d.title}>
                          {d.label}
                        </span>
                      </>
                    );
                  })()}
                </div>

                <div className='w-[86px] shrink-0'>
                  <button
                    type='button'
                    onClick={() => toggle(it)}
                    disabled={busyType === it.type}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition',
                      it.status === 1
                        ? 'border-mint/35 bg-mint/12 text-mint hover:bg-mint/20'
                        : 'border-white/15 bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70'
                    )}
                  >
                    {busyType === it.type ? <Spinner size={11} /> : <Icon name='power' size={11} />}
                    {it.status === 1 ? '已开启' : '已关闭'}
                  </button>
                </div>

                <div className='flex flex-wrap items-center gap-1.5'>
                  <button
                    type='button'
                    className={ACT_CLS}
                    onClick={() => {
                      setDetail(it);
                      setSub('credential');
                    }}
                  >
                    配置密钥
                  </button>
                  <button
                    type='button'
                    className={ACT_CLS}
                    onClick={() => {
                      setDetail(it);
                      setSub('accounts');
                    }}
                  >
                    账号列表
                  </button>
                  <button
                    type='button'
                    className={ACT_CLS}
                    onClick={() => {
                      setDetail(it);
                      setSub('logs');
                    }}
                  >
                    登录记录
                  </button>
                  <button
                    type='button'
                    className={ACT_CLS}
                    onClick={() => probeOne(it.type)}
                    disabled={probing[it.type]}
                  >
                    重新探测
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className='rounded-3xl border border-white/10 bg-ink-850/60 p-5'>
        <p className='text-[12px] leading-relaxed text-white/40'>
          说明：接口状态需在配置密钥后才可开启；「对接官方」模式需填写第三方平台颁发的 AppID 与 AppKey；「对接同系统」模式需配置远端同系统实例的接口地址、AppID 与 AppKey；「对接彩虹聚合」模式需配置彩虹聚合网关地址、聚合 AppID 与 AppKey，由网关统一代理各平台授权。列表中的状态圆点表示接口实时连通性：绿色为连通、红色为不通、灰色为未配置或正在探测。
        </p>
      </section>
    </div>
  );
}

function PlatformDetail({
  item,
  sub,
  onSub,
  onBack,
  onSaved,
  sysConfig,
  rainbowConfig,
}: {
  item: PlatformItem;
  sub: string;
  onSub: (k: string) => void;
  onBack: () => void;
  onSaved: () => void;
  sysConfig: { base: string; appid: string; appkey_set: boolean };
  rainbowConfig: { api: string; appid: string; appkey_set: boolean };
}) {
  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-mesh px-5 py-4 shadow-card'>
        <div className='flex min-w-0 items-center gap-3'>
          <button
            type='button'
            onClick={onBack}
            className='rounded-xl border border-white/12 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
            aria-label='返回接口列表'
          >
            <Icon name='arrow-left' size={16} />
          </button>
          <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80'>
            <Icon name={item.icon as IconName} size={20} />
          </span>
          <div className='min-w-0'>
            <h2 className='truncate text-base font-semibold text-cream'>{item.name}</h2>
            <p className='mt-0.5 truncate text-[11.5px] text-white/40'>
              {item.type} · {MODE_LABEL[item.mode] || item.mode} · {item.status === 1 ? '已开启' : '已关闭'}
            </p>
          </div>
        </div>
        {item.link ? (
          <a
            href={item.link}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-[11.5px] text-white/60 transition hover:bg-white/10 hover:text-white'
          >
            <Icon name='external' size={13} />
            官方申请入口
          </a>
        ) : null}
      </div>

      <div className='flex flex-wrap gap-2'>
        {SUBS.map((t) => (
          <button
            key={t.key}
            type='button'
            onClick={() => onSub(t.key)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[12.5px] transition',
              sub === t.key
                ? 'border-white/15 bg-white/10 font-medium text-cream'
                : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/8 hover:text-white/80'
            )}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className='rounded-3xl border border-white/10 bg-ink-850/70 p-5 shadow-soft'>
        {sub === 'credential' ? <CredentialPanel item={item} onSaved={onSaved} sysConfig={sysConfig} rainbowConfig={rainbowConfig} /> : null}
        {sub === 'accounts' ? <AccountList type={item.type} /> : null}
        {sub === 'logs' ? <LogList type={item.type} /> : null}
      </div>
    </div>
  );
}

function CredentialPanel({ item, onSaved, sysConfig, rainbowConfig }: { item: PlatformItem; onSaved: () => void; sysConfig: { base: string; appid: string; appkey_set: boolean }; rainbowConfig: { api: string; appid: string; appkey_set: boolean } }) {
  const toast = useToast();
  const [mode, setMode] = useState(item.mode);
  const [showname, setShowname] = useState(item.name);
  const [sort, setSort] = useState(String(item.sort));
  const link = item.link;
  const [appid, setAppid] = useState(item.appid);
  const [appkey, setAppkey] = useState('');
  const [sysBase, setSysBase] = useState(sysConfig.base);
  const [sysAppId, setSysAppId] = useState(sysConfig.appid);
  const [sysAppKey, setSysAppKey] = useState('');
  const [epAuth, setEpAuth] = useState('');
  const [epToken, setEpToken] = useState('');
  const [epInfo, setEpInfo] = useState('');
  const [saving, setSaving] = useState(false);

  const [rbApi, setRbApi] = useState(rainbowConfig.api);
  const [rbAppId, setRbAppId] = useState(rainbowConfig.appid);
  const [rbAppKey, setRbAppKey] = useState('');

  const isSystem = mode === 'system';
  const isRainbow = mode === 'rainbow';

  async function save() {
    if (saving) return;
    setSaving(true);
    const body: Record<string, string> = {
      type: item.type,
      mode,
      showname,
      sort,
    };
    if (isSystem) {
      body.system_base = sysBase;
      body.system_appid = sysAppId;
      if (sysAppKey !== '') body.system_appkey = sysAppKey;
    } else if (isRainbow) {
      body.rainbow_api = rbApi;
      body.rainbow_appid = rbAppId;
      if (rbAppKey !== '') body.rainbow_appkey = rbAppKey;
    } else {
      body.appid = appid;
      if (appkey !== '') body.appkey = appkey;
    }
    if (item.type === 'puddingchat') {
      if (epAuth !== '') body.endpoint_authorize = epAuth;
      if (epToken !== '') body.endpoint_token = epToken;
      if (epInfo !== '') body.endpoint_userinfo = epInfo;
    }
    const res = await post('platform.save', body);
    setSaving(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '保存失败');
      return;
    }
    toast.push('success', res.msg || '配置已保存');
    setAppkey('');
    setSysAppKey('');
    setRbAppKey('');
    setEpAuth('');
    setEpToken('');
    setEpInfo('');
    onSaved();
  }

  return (
    <div className='space-y-5'>
      <div>
        <p className='mb-3 text-[13px] font-medium tracking-wide text-white/55'>接口模式</p>
        <div className='grid gap-2.5 sm:grid-cols-3'>
          {(['official', 'system', 'rainbow'] as const).map((m) => (
            <button
              key={m}
              type='button'
              onClick={() => setMode(m)}
              className={cx(
                'rounded-2xl border p-3.5 text-left transition',
                mode === m
                  ? 'border-pudding-300/45 bg-pudding-300/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/8'
              )}
            >
              <div className='flex items-center justify-between gap-2'>
                <span className={cx('text-[13px] font-medium', mode === m ? 'text-cream' : 'text-white/65')}>
                  {MODE_LABEL[m]}
                </span>
                {mode === m ? <Icon name='check' size={13} className='text-pudding-200' /> : null}
              </div>
              <p className='mt-1.5 text-[11px] leading-relaxed text-white/35'>{MODE_DESC[m]}</p>
            </button>
          ))}
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        <label className='block'>
          <span className='mb-1.5 block text-[12px] text-white/45'>显示名称</span>
          <input value={showname} onChange={(e) => setShowname(e.target.value)} className={FIELD_CLS} />
        </label>
        <label className='block'>
          <span className='mb-1.5 block text-[12px] text-white/45'>排序值</span>
          <input value={sort} onChange={(e) => setSort(e.target.value)} className={FIELD_CLS} />
        </label>
        <label className='block'>
          <span className='mb-1.5 block text-[12px] text-white/45'>官方申请入口（只读）</span>
          <div className='flex items-center gap-1.5'>
            <input
              value={link}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              placeholder='该平台未提供官方申请入口'
              className={cx(FIELD_CLS, 'cursor-text select-all')}
            />
            {link ? (
              <button
                type='button'
                onClick={async () => {
                  const ok = await copyText(link);
                  toast.push(ok ? 'success' : 'error', ok ? '申请入口已复制' : '复制失败，请手动选择');
                }}
                className='shrink-0 rounded-xl border border-white/12 bg-white/5 p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white'
                title='复制申请入口'
              >
                <Icon name='copy' size={14} />
              </button>
            ) : null}
          </div>
        </label>
      </div>

      {isSystem ? (
        <div className='space-y-3'>
          <p className='text-[13px] font-medium tracking-wide text-white/55'>同系统对接配置</p>
          <label className='block'>
            <span className='mb-1.5 block text-[12px] text-white/45'>远端接口地址</span>
            <input value={sysBase} onChange={(e) => setSysBase(e.target.value)} placeholder='https://remote.example.com/connect.php' className={cx(FIELD_CLS, 'font-mono text-xs')} />
          </label>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-1.5 block text-[12px] text-white/45'>远端 AppID</span>
              <input value={sysAppId} onChange={(e) => setSysAppId(e.target.value)} placeholder='在远端创建的应用 AppID' className={cx(FIELD_CLS, 'font-mono text-xs')} />
            </label>
            <label className='block'>
              <span className='mb-1.5 block text-[12px] text-white/45'>远端 AppKey</span>
              <input
                type='password'
                value={sysAppKey}
                onChange={(e) => setSysAppKey(e.target.value)}
                placeholder={sysConfig.appkey_set ? '已配置，留空表示不修改' : '在远端创建的应用 AppKey'}
                className={cx(FIELD_CLS, 'font-mono text-xs')}
              />
            </label>
          </div>
          {sysConfig.appkey_set ? (
            <p className='text-[11px] text-white/30'>远端 AppKey 已配置，出于安全仅显示掩码；如需更换请直接填写新值。</p>
          ) : null}
        </div>
      ) : isRainbow ? (
        <div className='space-y-3'>
          <p className='text-[13px] font-medium tracking-wide text-white/55'>彩虹聚合网关</p>
          <label className='block'>
            <span className='mb-1.5 block text-[12px] text-white/45'>网关接口地址</span>
            <input value={rbApi} onChange={(e) => setRbApi(e.target.value)} placeholder='https://login.idcbdy.cn' className={cx(FIELD_CLS, 'font-mono text-xs')} />
          </label>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-1.5 block text-[12px] text-white/45'>聚合 AppID</span>
              <input value={rbAppId} onChange={(e) => setRbAppId(e.target.value)} placeholder='彩虹聚合平台创建的应用 AppID' className={cx(FIELD_CLS, 'font-mono text-xs')} />
            </label>
            <label className='block'>
              <span className='mb-1.5 block text-[12px] text-white/45'>聚合 AppKey</span>
              <input
                type='password'
                value={rbAppKey}
                onChange={(e) => setRbAppKey(e.target.value)}
                placeholder={rainbowConfig.appkey_set ? '已配置，留空表示不修改' : '彩虹聚合平台应用 AppKey'}
                className={cx(FIELD_CLS, 'font-mono text-xs')}
              />
            </label>
          </div>
          <p className='text-[11px] text-white/30'>
            网关由本系统统一调用，接口路径自动探测（/connect.php、/user/connect.php、/api.php 等）；本模式下单个平台无需再单独申请官方的 AppID 与 AppKey。
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          <p className='text-[13px] font-medium tracking-wide text-white/55'>接口凭据</p>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-1.5 block text-[12px] text-white/45'>AppID / Client ID</span>
              <input value={appid} onChange={(e) => setAppid(e.target.value)} placeholder='AppID' className={cx(FIELD_CLS, 'font-mono text-xs')} />
            </label>
            <label className='block'>
              <span className='mb-1.5 block text-[12px] text-white/45'>AppKey / Client Secret</span>
              <input
                type='password'
                value={appkey}
                onChange={(e) => setAppkey(e.target.value)}
                placeholder={item.appkey_set ? '已配置，留空表示不修改' : 'AppKey'}
                className={cx(FIELD_CLS, 'font-mono text-xs')}
              />
            </label>
          </div>
          {item.appkey_set ? (
            <p className='text-[11px] text-white/30'>密钥已配置，出于安全仅显示掩码；如需更换请直接填写新值。</p>
          ) : null}
        </div>
      )}

      {item.type === 'puddingchat' ? (
        <div className='space-y-3'>
          <p className='text-[13px] font-medium tracking-wide text-white/55'>自定义 OAuth 端点</p>
          <input value={epAuth} onChange={(e) => setEpAuth(e.target.value)} placeholder='授权地址 https://id.example.com/oauth2/authorize' className={cx(FIELD_CLS, 'font-mono text-xs')} />
          <input value={epToken} onChange={(e) => setEpToken(e.target.value)} placeholder='令牌地址 https://id.example.com/oauth2/token' className={cx(FIELD_CLS, 'font-mono text-xs')} />
          <input value={epInfo} onChange={(e) => setEpInfo(e.target.value)} placeholder='用户信息地址 https://id.example.com/oauth2/userinfo' className={cx(FIELD_CLS, 'font-mono text-xs')} />
          <p className='text-[11px] text-white/30'>留空表示保留原值；三个地址均为标准 OAuth2 端点。</p>
        </div>
      ) : null}

      <button
        type='button'
        onClick={save}
        disabled={saving}
        className='inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pudding-gradient px-5 py-3 text-sm font-semibold text-on-pudding transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60'
      >
        {saving ? <Spinner size={14} /> : <Icon name='check' size={15} />}
        保存接口配置
      </button>
    </div>
  );
}

function AccountList({ type }: { type: string }) {
  const [data, setData] = useState<Paged<PlatformAccount> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [kw, setKw] = useState('');
  const [kwInput, setKwInput] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    get<Paged<PlatformAccount>>('platform.accounts', { type, page, size: 10, kw }).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.code === 0 && res.data) setData(res.data);
      else setData({ items: [], total: 0, page: 1, size: 10 });
    });
    return () => {
      alive = false;
    };
  }, [type, page, kw]);

  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='text-[13px] font-medium text-cream/90'>授权账号</p>
          <p className='mt-1 text-[11.5px] text-white/35'>该接口下已授权的社交账号，共 {total} 条</p>
        </div>
        <div className='flex items-center gap-2'>
          <input
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            placeholder='搜索昵称或用户'
            className='w-40 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-cream outline-none placeholder:text-white/25 focus:border-pudding-300/60'
          />
          <button
            type='button'
            className={ACT_CLS}
            onClick={() => {
              setKw(kwInput.trim());
              setPage(1);
            }}
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center gap-2 py-10 text-sm text-white/40'>
          <Spinner size={15} />
          读取中…
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className='py-10 text-center text-sm text-white/30'>暂无授权账号</p>
      ) : (
        <div className='divide-y divide-white/6 rounded-2xl border border-white/8'>
          {data.items.map((a) => (
            <div key={a.id} className='flex flex-wrap items-center gap-3 px-4 py-2.5'>
              <div className='flex min-w-[140px] flex-1 items-center gap-2.5'>
                <span className='flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-ink-800 text-[10.5px] font-semibold text-cream'>
                  {a.faceimg ? (
                    <img src={a.faceimg} alt={a.nickname} className='h-full w-full object-cover' referrerPolicy='no-referrer' />
                  ) : (
                    (a.nickname || '?').slice(0, 1)
                  )}
                </span>
                <span className='truncate text-[12.5px] text-cream/85'>{a.nickname || '未命名'}</span>
              </div>
              <span className='w-[120px] shrink-0 truncate font-mono text-[11px] text-white/35'>{a.social_uid}</span>
              <span className='w-[100px] shrink-0 truncate text-[11.5px] text-white/45'>{a.username || '未绑定'}</span>
              <span className='w-[140px] shrink-0 text-[11px] text-white/30'>{a.addtime}</span>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-center justify-between text-[11.5px] text-white/35'>
        <span>
          第 {page} / {pages} 页
        </span>
        <div className='flex gap-2'>
          <button type='button' className={ACT_CLS} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            上一页
          </button>
          <button type='button' className={ACT_CLS} disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function LogList({ type }: { type: string }) {
  const [data, setData] = useState<Paged<PlatformLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    get<Paged<PlatformLog>>('platform.logs', { type, page, size: 10 }).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.code === 0 && res.data) setData(res.data);
      else setData({ items: [], total: 0, page: 1, size: 10 });
    });
    return () => {
      alive = false;
    };
  }, [type, page]);

  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className='space-y-4'>
      <div>
        <p className='text-[13px] font-medium text-cream/90'>登录记录</p>
        <p className='mt-1 text-[11.5px] text-white/35'>与该接口相关的授权与登录行为，共 {total} 条</p>
      </div>

      {loading ? (
        <div className='flex items-center justify-center gap-2 py-10 text-sm text-white/40'>
          <Spinner size={15} />
          读取中…
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className='py-10 text-center text-sm text-white/30'>暂无登录记录</p>
      ) : (
        <div className='divide-y divide-white/6 rounded-2xl border border-white/8'>
          {data.items.map((l) => (
            <div key={l.id} className='flex flex-wrap items-center gap-3 px-4 py-2.5'>
              <span className='w-[130px] shrink-0 truncate text-[12px] text-cream/80'>{l.username || '游客'}</span>
              <span className='w-[130px] shrink-0 truncate text-[11.5px] text-white/45'>{l.type}</span>
              <span className='w-[120px] shrink-0 truncate font-mono text-[11px] text-white/35'>{l.ip || '-'}</span>
              <span className='w-[150px] shrink-0 text-[11px] text-white/30'>{l.date}</span>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-center justify-between text-[11.5px] text-white/35'>
        <span>
          第 {page} / {pages} 页
        </span>
        <div className='flex gap-2'>
          <button type='button' className={ACT_CLS} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            上一页
          </button>
          <button type='button' className={ACT_CLS} disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

