import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { get, post, upload, type SettingField, type Site } from '../lib/api';
import { cx, Spinner, useToast } from '../lib/ui';

type DetailData = {
  group: string;
  meta: { key: string; label: string; icon: string; desc: string; actions: string[] };
  fields: Record<string, SettingField>;
  values: Record<string, string | boolean>;
};

const FIELD_CLS =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50';

const CLEANUP_TARGETS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'flow', label: '过期授权流程', desc: '清理 pl_connect_flow 中已过期的授权状态记录' },
  { key: 'code', label: '过期授权码', desc: '清理 pl_connect_code 中已过期或已使用的授权码' },
  { key: 'adminlog', label: '管理操作日志', desc: '按保留天数清理后台审计日志' },
  { key: 'userlog', label: '用户行为日志', desc: '按保留天数清理用户行为日志' },
];

const GROUPS: Array<{ key: string; label: string; icon: IconName }> = [
  { key: 'site', label: '网站信息配置', icon: 'shield' },
  { key: 'login', label: '快捷登录配置', icon: 'lock' },
  { key: 'pay', label: '支付接口配置', icon: 'chart' },
  { key: 'notice', label: '网站公告配置', icon: 'logs' },
  { key: 'mail', label: '邮箱与短信配置', icon: 'mail' },
  { key: 'logo', label: '网站 Logo 上传', icon: 'sparkle' },
  { key: 'captcha', label: '图形验证码配置', icon: 'shield' },
  { key: 'ip', label: 'IP 地址获取设置', icon: 'link' },
  { key: 'cleanup', label: '数据清理', icon: 'trash' },
  { key: 'update', label: '检测更新', icon: 'refresh' },
];

export default function SystemSettingsPage({ site }: { site: Site }) {
  const toast = useToast();
  const [active, setActive] = useState('site');
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(
    (group: string) => {
      setLoading(true);
      get<DetailData>('system.get', { group }).then((res) => {
        setLoading(false);
        if (res.code === 0 && res.data) {
          const detail = res.data;
          setData(detail);
          const next: Record<string, string> = {};
          Object.keys(detail.fields).forEach((k) => {
            const v = detail.values[k];
            next[k] = typeof v === 'boolean' ? (v ? '1' : '0') : String(v ?? '');
          });
          setForm(next);
        } else {
          toast.push('error', res.msg || '读取设置失败');
        }
      });
    },
    [toast]
  );

  useEffect(() => {
    load(active);
  }, [active, load]);

  async function save() {
    if (!data || saving) return;
    setSaving(true);
    const body: Record<string, string> = { group: data.group };
    Object.keys(data.fields).forEach((k) => {
      const def = data.fields[k];
      const v = form[k] ?? '';
      if (def.kind === 'secret') {
        if (v !== '' && v.indexOf('*') === -1) body[k] = v;
        return;
      }
      body[k] = v;
    });
    const res = await post('system.save', body);
    setSaving(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '保存失败');
      return;
    }
    toast.push('success', res.msg || '设置已保存');
    load(data.group);
  }

  return (
    <div className='space-y-5'>
      <section className='rounded-3xl border border-white/10 bg-mesh px-5 py-4 shadow-card'>
        <h2 className='text-base font-semibold text-cream'>系统设置</h2>
        <p className='mt-1 text-[12px] text-white/40'>每个分组独立配置、独立保存，修改后立即生效</p>
        {site.demo_on ? <p className='mt-1 text-[12px] text-amber-300/85'>演示模式已开启：仅「演示模式」与「演示密码」可修改，其余设置均为只读</p> : null}
      </section>

      <div className='flex flex-col gap-4 lg:flex-row'>
        <aside className='shrink-0 lg:w-[228px]'>
          <div className='space-y-1 rounded-3xl border border-white/10 bg-ink-850/70 p-2 shadow-soft'>
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type='button'
                onClick={() => setActive(g.key)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-[13px] transition',
                  active === g.key
                    ? 'border border-white/12 bg-white/10 font-medium text-cream'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/85'
                )}
              >
                <Icon name={g.icon} size={15} />
                <span className='truncate'>{g.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className='min-w-0 flex-1 rounded-3xl border border-white/10 bg-ink-850/70 p-5 shadow-soft'>
          {loading || !data ? (
            <div className='flex items-center justify-center gap-2 py-16 text-sm text-white/40'>
              <Spinner size={16} />
              正在读取设置…
            </div>
          ) : (
            <div className='space-y-5'>
              <div>
                <h3 className='text-[15px] font-semibold text-cream'>{data.meta.label}</h3>
                <p className='mt-1 text-[12px] leading-relaxed text-white/40'>{data.meta.desc}</p>
              </div>

              {data.group === 'cleanup' ? (
                <CleanupPanel demoOn={site.demo_on} />
              ) : data.group === 'update' ? (
                <UpdatePanel />
              ) : data.group === 'logo' ? (
                <LogoPanel form={form} setForm={setForm} fields={data.fields} demoOn={site.demo_on} />
              ) : (
                <div className='space-y-3.5'>
                  {(() => {
                    const blocks: Array<{ title: string; keys: string[] }> = [];
                    Object.keys(data.fields).forEach((key) => {
                      const def = data.fields[key];
                      const conds = def.show_if?.any ?? [];
                      if (conds.length > 0) {
                        const hit = conds.some((c) => c.in.includes(form[c.key] ?? ''));
                        if (!hit) return;
                      }
                      const title = def.show_if?.label ?? '';
                      const last = blocks[blocks.length - 1];
                      if (title !== '' && last && last.title === title) {
                        last.keys.push(key);
                      } else {
                        blocks.push({ title, keys: [key] });
                      }
                    });
                    return blocks.map((b, idx) => {
                      const rows = b.keys.map((k) => (
                        <FieldRow
                          key={k}
                          def={data.fields[k]}
                          value={form[k] ?? ''}
                          onChange={(v) => setForm((prev) => ({ ...prev, [k]: v }))}
                          disabled={site.demo_on && k !== 'test_open' && k !== 'demo_password'}
                        />
                      ));
                      if (b.title === '') return rows;
                      return (
                        <section
                          key={b.title + '-' + idx}
                          className='space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4'
                        >
                          <p className='text-[12px] font-semibold tracking-wide text-pudding-200'>{b.title}</p>
                          {rows}
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {data.group !== 'cleanup' && data.group !== 'update' ? (
                <button
                  type='button'
                  onClick={save}
                  disabled={saving || (site.demo_on && data.group !== 'login')}
                  className='inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pudding-gradient px-5 py-3 text-sm font-semibold text-on-pudding transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60'
                >
                  {saving ? <Spinner size={14} /> : <Icon name='check' size={15} />}
                  保存本组设置
                </button>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FieldRow({
  def,
  value,
  onChange,
  disabled = false,
}: {
  def: SettingField;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (def.kind === 'bool') {
    const on = value === '1';
    return (
      <button
        type='button'
        disabled={disabled}
        onClick={() => onChange(on ? '0' : '1')}
        className={cx(
          'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
          on ? 'border-mint/35 bg-mint/8' : 'border-white/10 bg-white/[0.03] hover:bg-white/8'
        )}
      >
        <span>
          <span className={cx('block text-[13px] font-medium', on ? 'text-cream' : 'text-white/65')}>
            {def.label}
          </span>
          {def.desc ? <span className='mt-1 block text-[11.5px] text-white/35'>{def.desc}</span> : null}
        </span>
        <span
          className={cx(
            'relative h-5 w-9 shrink-0 rounded-full transition',
            on ? 'bg-mint/70' : 'bg-white/15'
          )}
        >
          <span
            className={cx(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
              on ? 'left-[18px]' : 'left-0.5'
            )}
          />
        </span>
      </button>
    );
  }

  if (def.kind === 'textarea') {
    return (
      <label className='block'>
        <span className='mb-1.5 block text-[12.5px] text-white/45'>{def.label}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={3}
          disabled={disabled}
          className={cx(FIELD_CLS, 'resize-y leading-relaxed')}
        />
        {def.desc ? <span className='mt-1 block text-[11px] text-white/30'>{def.desc}</span> : null}
      </label>
    );
  }

  if (def.kind === 'select' && def.options) {
    const opts = def.options;
    return (
      <label className='block'>
        <span className='mb-1.5 block text-[12.5px] text-white/45'>{def.label}</span>
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={FIELD_CLS}>
          {Object.keys(opts).map((k) => (
            <option key={k} value={k} className='bg-ink-850 text-cream'>
              {opts[k]}
            </option>
          ))}
        </select>
        {def.desc ? <span className='mt-1 block text-[11px] text-white/30'>{def.desc}</span> : null}
      </label>
    );
  }

  return (
    <label className='block'>
      <span className='mb-1.5 flex items-center gap-2 text-[12.5px] text-white/45'>
        {def.label}
        {def.kind === 'secret' && value ? (
          <span className='rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[10px] text-mint'>
            已配置
          </span>
        ) : null}
      </span>
      <input
        type={def.kind === 'secret' ? 'password' : def.kind === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.placeholder}
        disabled={disabled}
        className={cx(FIELD_CLS, def.mono && 'font-mono text-xs')}
      />
      {def.desc ? <span className='mt-1 block text-[11px] text-white/30'>{def.desc}</span> : null}
      {def.kind === 'secret' ? (
        <span className='mt-1 block text-[11px] text-white/30'>已保存的密钥仅显示掩码，留空表示不修改</span>
      ) : null}
    </label>
  );
}

function LogoPanel({
  form,
  setForm,
  demoOn,
  fields,
}: {
  form: Record<string, string>;
  setForm: Dispatch<SetStateAction<Record<string, string>>>;
  fields: Record<string, SettingField>;
  demoOn: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const logoRef = useRef<HTMLInputElement | null>(null);
  const iconRef = useRef<HTMLInputElement | null>(null);

  async function pick(file: File | null | undefined, kind: 'logo' | 'favicon') {
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.push('error', '文件超过 512KB 限制');
      return;
    }
    setBusy(kind);
    const res = await upload<{ path: string; kind: string }>('system.logo.upload', file, { kind });
    setBusy('');
    if (res.code !== 0 || !res.data) {
      toast.push('error', res.msg || '上传失败');
      return;
    }
    const path = res.data.path;
    toast.push('success', '上传成功');
    const fieldKey = kind === 'logo' ? 'logo_path' : 'favicon_path';
    setForm((prev) => ({ ...prev, [fieldKey]: path }));
  }

  return (
    <div className='space-y-4'>
      {Object.keys(fields).map((key) => {
        const def = fields[key];
        const isLogo = key === 'logo_path';
        const current = form[key] || '';
        const kind = isLogo ? 'logo' : 'favicon';
        return (
          <div key={key} className='rounded-2xl border border-white/10 bg-white/[0.03] p-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-[13px] font-medium text-cream/90'>{def.label}</p>
                <p className='mt-1 truncate font-mono text-[11px] text-white/35'>{current || '未设置'}</p>
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => (isLogo ? logoRef : iconRef).current?.click()}
                  disabled={busy !== '' || demoOn}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-[11.5px] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-60'
                >
                  {busy === kind ? <Spinner size={12} /> : <Icon name='plus' size={12} />}
                  上传文件
                </button>
                {current ? (
                  <a
                    href={current}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-[11.5px] text-white/60 transition hover:bg-white/10 hover:text-white'
                  >
                    <Icon name='external' size={12} />
                    查看
                  </a>
                ) : null}
              </div>
            </div>
            <input
              ref={isLogo ? logoRef : iconRef}
              type='file'
              accept='image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon'
              className='hidden'
              onChange={(e) => {
                const files = e.target.files;
                const f = files && files.length > 0 ? files[0] : null;
                pick(f, kind);
                e.target.value = '';
              }}
            />
            <input
              value={current}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={def.placeholder}
              className={cx(FIELD_CLS, 'mt-3 font-mono text-xs')}
            />
          </div>
        );
      })}
      <p className='text-[11px] leading-relaxed text-white/30'>
        支持 PNG / JPEG / SVG / WEBP / ICO，单文件不超过 512KB，上传后写入 assets/upload 目录。
      </p>
    </div>
  );
}

function CleanupPanel({ demoOn }: { demoOn: boolean }) {
  const toast = useToast();
  const [days, setDays] = useState('90');
  const [busy, setBusy] = useState('');

  async function run(target: string) {
    if (busy) return;
    setBusy(target);
    const res = await post<{ target: string; deleted: number }>('system.cleanup', { target, days });
    setBusy('');
    if (res.code !== 0) {
      toast.push('error', res.msg || '清理失败');
      return;
    }
    toast.push('success', res.msg || '已清理');
  }

  return (
    <div className='space-y-3'>
      <label className='block'>
        <span className='mb-1.5 block text-[12.5px] text-white/45'>日志保留天数（仅对日志类生效）</span>
        <input
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className={cx(FIELD_CLS, 'max-w-[160px]')}
        />
      </label>
      {CLEANUP_TARGETS.map((t) => (
        <div
          key={t.key}
          className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3'
        >
          <div className='min-w-0'>
            <p className='text-[13px] font-medium text-cream/90'>{t.label}</p>
            <p className='mt-1 text-[11.5px] leading-relaxed text-white/35'>{t.desc}</p>
          </div>
          <button
            type='button'
            onClick={() => run(t.key)}
            disabled={busy !== '' || demoOn}
            className='inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-berry-400/35 bg-berry-400/10 px-3 py-2 text-[11.5px] text-berry-200 transition hover:bg-berry-400/20 disabled:opacity-60'
          >
            {busy === t.key ? <Spinner size={12} /> : <Icon name='trash' size={12} />}
            立即清理
          </button>
        </div>
      ))}
      <p className='text-[11px] leading-relaxed text-white/30'>清理操作不可撤销，建议先备份数据库。</p>
    </div>
  );
}

type UpdateInfo = {
  local: Record<string, string | number>;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  latest: string;
  has_update: boolean;
  checked_at: string;
};

function UpdatePanel() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    get<UpdateInfo>('system.update.check').then((res) => {
      setLoading(false);
      if (res.code === 0 && res.data) setInfo(res.data);
      else toast.push('error', res.msg || '检测失败');
    });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cards: Array<{ k: string; v: string | number | undefined }> = info
    ? [
        { k: '当前版本', v: info.local.version },
        { k: 'PHP 版本', v: info.local.php },
        { k: '注册用户', v: info.local.users },
        { k: '应用数量', v: info.local.apps },
        { k: '登录接口', v: info.local.platforms },
        { k: '已开启接口', v: info.local.opened },
      ]
    : [];

  return (
    <div className='space-y-4'>
      <button
        type='button'
        onClick={load}
        disabled={loading}
        className='inline-flex items-center gap-2 rounded-2xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
      >
        {loading ? <Spinner size={14} /> : <Icon name='refresh' size={14} />}
        重新检测
      </button>

      {info ? (
        <>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {cards.map((it) => (
              <div key={it.k} className='rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3'>
                <p className='text-[11.5px] text-white/35'>{it.k}</p>
                <p className='mt-1 text-lg font-semibold text-cream'>{String(it.v ?? '-')}</p>
              </div>
            ))}
          </div>

          <div className='space-y-2'>
            {info.checks.map((c, i) => (
              <div
                key={i}
                className='flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5'
              >
                <Icon name={c.ok ? 'check' : 'close'} size={14} className={c.ok ? 'text-mint' : 'text-berry-200'} />
                <span className='text-[12.5px] text-cream/85'>{c.name}</span>
                <span className='text-[11.5px] text-white/35'>{c.detail}</span>
              </div>
            ))}
          </div>

          <p className='text-[11px] text-white/30'>
            最新版本 {info.latest} · 检测时间 {info.checked_at} ·{' '}
            {info.has_update ? '发现新版本' : '已是最新版本'}
          </p>
        </>
      ) : null}
    </div>
  );
}
