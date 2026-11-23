import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { get, post, socialLabel, type AppItem, type Site } from '../lib/api';
import { copyText, cx, Field, Modal, Spinner, useToast } from '../lib/ui';

type TypeOption = { value: string; label: string; icon: IconName };

function typeIcon(t: string): IconName {
  if (t === 'qq') return 'qq';
  if (t === 'wx' || t === 'wechat') return 'wechat';
  if (t === 'alipay') return 'alipay';
  return 'link';
}

function typeLabel(t: string) {
  return socialLabel(t === 'wechat' ? 'wx' : t);
}

const EMPTY_FORM = { id: 0, name: '', types: [] as string[], status: 1, domains: '' };

export default function AppsPage({ site }: { site: Site }) {
  const toast = useToast();
  const [items, setItems] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [expand, setExpand] = useState<number | null>(null);
  const origin = window.location.origin;
  const options: TypeOption[] = useMemo(() => {
    const enabled = (site.types || []).filter((t) => t.enabled);
    const src = enabled.length > 0 ? enabled : site.types || [];
    return src.map((t) => ({ value: t.type, label: t.name, icon: (t.icon || t.type) as IconName }));
  }, [site.types]);

  const load = useCallback(() => {
    setLoading(true);
    get<{ items: AppItem[] }>('apps').then((res) => {
      if (res.code === 0 && res.data) setItems(res.data.items || []);
      else toast.push('error', res.msg || '加载失败');
      setLoading(false);
    });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const editing = form.id > 0;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, types: options.map((o) => o.value) });
    setErr('');
    setOpen(true);
  };

  const appTypes = (a: AppItem): string[] => {
    if (a.types && a.types.length > 0) return a.types;
    return a.type ? [a.type] : [];
  };

  const openEdit = (a: AppItem) => {
    setForm({
      id: a.id,
      name: a.name,
      types: appTypes(a),
      status: a.status,
      domains: (a.domains || []).join('\n'),
    });
    setErr('');
    setOpen(true);
  };

  const toggleType = (value: string) => {
    setForm((f) => ({
      ...f,
      types: f.types.includes(value) ? f.types.filter((t) => t !== value) : [...f.types, value],
    }));
  };

  const submit = async () => {
    if (busy) return;
    if (!form.name.trim()) {
      setErr('请填写应用名称');
      return;
    }
    if (form.types.length === 0) {
      setErr('请至少勾选一种登录方式');
      return;
    }
    setBusy(true);
    setErr('');
    const act = editing ? 'app.update' : 'app.create';
    const res = await post(act, {
      id: form.id,
      name: form.name.trim(),
      types: form.types.join(','),
      status: form.status,
      domains: form.domains,
    });
    setBusy(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '已保存');
      setOpen(false);
      load();
    } else {
      setErr(res.msg || '操作失败');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    setBusy(true);
    const res = await post('app.delete', { id: confirmId });
    setBusy(false);
    setConfirmId(null);
    if (res.code === 0) {
      toast.push('success', res.msg || '已删除');
      load();
    } else {
      toast.push('error', res.msg || '删除失败');
    }
  };

  const doReset = async (a: AppItem) => {
    const res = await post<{ appkey: string }>('app.reset', { id: a.id });
    if (res.code === 0 && res.data) {
      toast.push('success', 'AppKey 已重置');
      load();
      if (await copyText(res.data.appkey)) toast.push('info', '新 AppKey 已复制到剪贴板');
    } else {
      toast.push('error', res.msg || '重置失败');
    }
  };

  const copy = async (text: string, tip = '已复制') => {
    if (await copyText(text)) toast.push('success', tip);
    else toast.push('error', '复制失败，请手动选择');
  };

  const sdkCode = (a: AppItem) =>
    '<!-- 1. 引入 PuddingLogin 登录 SDK -->\n' +
    '<script src="' + origin + '/sdk.js"></script>\n\n' +
    '<!-- 2. 在页面放置登录按钮容器 -->\n' +
    '<div id="pl-login"></div>\n\n' +
    '<!-- 3. 初始化并渲染按钮 -->\n' +
    '<script>\n' +
    '  PlLogin.init({\n' +
    "    appid: '" + a.appid + "',\n" +
    "    redirect_uri: 'https://your-site.com/callback'\n" +
    '  }).mount("#pl-login");\n' +
    '</script>';

  const serverCode = (a: AppItem) =>
    '<?php\n' +
    '// 回调页接收 type 与 code，由服务端换取用户信息（AppKey 不要出现在前端）\n' +
    '$code = $_GET["code"] ?? "";\n' +
    '$url = "' + origin + '/connect.php?act=callback&appid=' + a.appid + '&appkey=你的AppKey&code=".urlencode($code);\n' +
    '$resp = json_decode(file_get_contents($url), true);\n' +
    'if (($resp["code"] ?? -1) === 0) {\n' +
    '    $socialUid = $resp["social_uid"]; // 唯一标识，建议作为账号主键\n' +
    '    $nickname  = $resp["nickname"];\n' +
    '    $avatar    = $resp["faceimg"];\n' +
    '} else {\n' +
    '    exit("登录失败：".($resp["msg"] ?? "未知错误"));\n' +
    '}';

  const total = useMemo(() => items.length, [items]);

  return (
    <div className='mx-auto w-full max-w-6xl space-y-6'>
      <section className='flex flex-col gap-4 rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-cream'>我的应用</h1>
          <p className='mt-1.5 text-sm text-white/45'>共 {total} 个应用 · 通过 AppID 与 AppKey 调用聚合登录接口</p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='inline-flex items-center justify-center gap-2 rounded-2xl bg-pudding-gradient px-5 py-3 text-sm font-semibold text-on-pudding shadow-glow transition hover:brightness-105 active:scale-[0.98]'
        >
          <Icon name='plus' size={16} />
          创建应用
        </button>
      </section>

      {loading ? (
        <div className='flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-ink-850/80 py-20 text-sm text-white/40'>
          <Spinner size={18} />
          正在加载应用列表…
        </div>
      ) : items.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/12 bg-ink-850/60 py-20 text-center'>
          <div className='rounded-2xl border border-white/10 bg-white/5 p-4 text-white/30'>
            <Icon name='apps' size={26} />
          </div>
          <div>
            <p className='text-base font-medium text-cream'>还没有创建应用</p>
            <p className='mt-1 text-sm text-white/40'>创建应用后可获得 AppID 与 AppKey，用于接入聚合登录</p>
          </div>
          <button
            type='button'
            onClick={openCreate}
            className='inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white'
          >
            <Icon name='plus' size={15} />
            立即创建
          </button>
        </div>
      ) : (
        <div className='space-y-4'>
          {items.map((a) => (
            <section key={a.id} className='overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80 shadow-soft'>
              <div className='flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                <div className='flex min-w-0 items-center gap-4'>
                  <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cream'>
                    <Icon name={typeIcon(a.type)} size={22} />
                  </div>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='truncate text-base font-semibold text-cream'>{a.name}</h2>
                      <span
                        className={cx(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          a.status === 1
                            ? 'border-mint/30 bg-mint/10 text-mint'
                            : 'border-white/15 bg-white/5 text-white/45'
                        )}
                      >
                        {a.status === 1 ? '已启用' : '已停用'}
                      </span>
                    </div>
                    <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                      <span className='text-[11px] text-white/35'>可用登录方式</span>
                      {appTypes(a).map((t) => (
                        <span
                          key={t}
                          className='inline-flex items-center gap-1 rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 text-[11px] text-white/60'
                        >
                          <Icon name={typeIcon(t)} size={11} />
                          {typeLabel(t)}
                        </span>
                      ))}
                    </div>
                    <p className='mt-1 truncate text-[11px] text-white/30'>创建于 {a.addtime}</p>
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setExpand(expand === a.id ? null : a.id)}
                    className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
                  >
                    <Icon name='code' size={14} />
                    接入信息
                  </button>
                  <button
                    type='button'
                    onClick={() => openEdit(a)}
                    className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
                  >
                    <Icon name='edit' size={14} />
                    编辑
                  </button>
                  <button
                    type='button'
                    onClick={() => setConfirmId(a.id)}
                    className='inline-flex items-center gap-1.5 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/20'
                  >
                    <Icon name='trash' size={14} />
                    删除
                  </button>
                </div>
              </div>
              <div className='grid gap-3 border-t border-white/8 px-5 py-4 sm:grid-cols-2 sm:px-6'>
                <div className='rounded-xl border border-white/10 bg-black/20 px-3 py-2'>
                  <p className='text-[11px] text-white/35'>AppID</p>
                  <div className='mt-1 flex items-center gap-2'>
                    <code className='min-w-0 flex-1 truncate font-mono text-xs text-cream/90'>{a.appid}</code>
                    <button type='button' onClick={() => copy(a.appid, 'AppID 已复制')} className='shrink-0 text-white/40 transition hover:text-white'>
                      <Icon name='copy' size={13} />
                    </button>
                  </div>
                </div>
                <div className='rounded-xl border border-white/10 bg-black/20 px-3 py-2'>
                  <p className='text-[11px] text-white/35'>AppKey（仅服务端使用）</p>
                  <div className='mt-1 flex items-center gap-2'>
                    <code className='min-w-0 flex-1 truncate font-mono text-xs text-cream/90'>{a.appkey}</code>
                    <button type='button' onClick={() => copy(a.appkey, 'AppKey 已复制')} className='shrink-0 text-white/40 transition hover:text-white'>
                      <Icon name='copy' size={13} />
                    </button>
                  </div>
                </div>
              </div>
              {expand === a.id ? (
                <div className='space-y-4 border-t border-white/8 bg-black/20 px-5 py-5 sm:px-6'>
                  <div>
                    <p className='text-[12px] font-medium text-cream/85'>授权回调域名</p>
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {(a.domains || []).length === 0 ? (
                        <span className='text-[11.5px] text-white/35'>未限制域名（不校验来源，建议补充以启用 SDK 免密钥登录）</span>
                      ) : (
                        a.domains.map((d) => (
                          <span key={d} className='rounded-md border border-white/12 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/60'>
                            {d}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => copy(sdkCode(a), 'SDK 接入代码已复制')}
                      className='inline-flex items-center gap-1.5 rounded-xl border border-pudding-300/40 bg-pudding-400/12 px-3.5 py-2 text-xs font-medium text-pudding-200 transition hover:bg-pudding-400/20'
                    >
                      <Icon name='copy' size={13} />
                      复制 SDK 接入代码
                    </button>
                    <button
                      type='button'
                      onClick={() => copy(serverCode(a), '服务端换取示例已复制')}
                      className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
                    >
                      <Icon name='copy' size={13} />
                      复制服务端换取示例
                    </button>
                    <a
                      href='/doc.php'
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
                    >
                      <Icon name='external' size={13} />
                      完整接入文档
                    </a>
                    <button
                      type='button'
                      onClick={() => doReset(a)}
                      className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
                    >
                      <Icon name='refresh' size={13} />
                      重置 AppKey
                    </button>
                  </div>
                  <div>
                    <p className='text-[12px] font-medium text-cream/85'>前端一键登录</p>
                    <pre className='mt-2 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3.5 text-[11.5px] leading-relaxed text-white/70'>
                      <code>{sdkCode(a)}</code>
                    </pre>
                  </div>
                  <div>
                    <p className='text-[12px] font-medium text-cream/85'>服务端换取用户信息</p>
                    <pre className='mt-2 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3.5 text-[11.5px] leading-relaxed text-white/70'>
                      <code>{serverCode(a)}</code>
                    </pre>
                  </div>
                  <p className='text-[11.5px] leading-relaxed text-white/35'>
                    回调页会收到 <code className='font-mono text-white/50'>?type=xx&amp;code=xx</code>，请在你的服务端用 code 调用换取接口，用户信息中的 social_uid 作为该平台账号唯一标识。
                  </p>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? '编辑应用' : '创建应用'}
        subtitle={editing ? '修改应用名称、可用登录方式与回调域名' : '创建后将生成 AppID 与 AppKey'}
        footer={
          <>
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              取消
            </button>
            <button
              type='button'
              onClick={submit}
              disabled={busy}
              className='inline-flex items-center gap-2 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
            >
              {busy ? <Spinner size={14} /> : <Icon name='check' size={14} />}
              {editing ? '保存修改' : '创建'}
            </button>
          </>
        }
      >
        <div className='space-y-4'>
          <Field label='应用名称'>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={32}
              placeholder='例如：布丁云博客'
              className='w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
            />
          </Field>
          <Field
            label='可用登录方式'
            hint={<span className='text-[11px] text-white/30'>可多选，仅列出本站已开启且已配置的登录方式</span>}
          >
            {options.length === 0 ? (
              <p className='rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-center text-xs text-white/35'>
                暂无已开启的登录方式，请先在后台「登录接口」中配置并开启
              </p>
            ) : (
              <div className='grid grid-cols-3 gap-2'>
                {options.map((t) => {
                  const on = form.types.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type='button'
                      onClick={() => toggleType(t.value)}
                      className={cx(
                        'relative flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-xs font-medium transition',
                        on
                          ? 'border-pudding-300/60 bg-pudding-400/12 text-cream'
                          : 'border-white/12 bg-white/5 text-white/55 hover:bg-white/8 hover:text-white/80'
                      )}
                    >
                      <Icon name={t.icon} size={24} />
                      {t.label}
                      {on ? (
                        <span className='absolute right-2 top-2 text-pudding-300'>
                          <Icon name='check' size={12} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>
          {editing ? (
            <Field label='应用状态'>
              <div className='grid grid-cols-2 gap-2'>
                {[
                  { v: 1, label: '启用', icon: 'power' as IconName },
                  { v: 0, label: '停用', icon: 'eye-off' as IconName },
                ].map((o) => (
                  <button
                    key={o.v}
                    type='button'
                    onClick={() => setForm({ ...form, status: o.v })}
                    className={cx(
                      'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-medium transition',
                      form.status === o.v
                        ? 'border-mint/45 bg-mint/10 text-mint'
                        : 'border-white/12 bg-white/5 text-white/55 hover:bg-white/8'
                    )}
                  >
                    <Icon name={o.icon} size={14} />
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
          <Field label='授权回调域名' hint={<span className='text-[11px] text-white/30'>可选，留空不校验；填写后仅允许这些域名回调</span>}>
            <textarea
              value={form.domains}
              onChange={(e) => setForm({ ...form, domains: e.target.value })}
              rows={4}
              placeholder={'example.com\nwww.example.com'}
              className='w-full resize-y rounded-2xl border border-white/12 bg-white/5 px-4 py-3 font-mono text-xs text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
            />
          </Field>
          {err ? <p className='rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200'>{err}</p> : null}
        </div>
      </Modal>
      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title='删除应用'
        subtitle='删除后该应用的 AppID 与 AppKey 立即失效，且不可恢复'
        className='max-w-md'
        footer={
          <>
            <button
              type='button'
              onClick={() => setConfirmId(null)}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              取消
            </button>
            <button
              type='button'
              onClick={doDelete}
              disabled={busy}
              className='inline-flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60'
            >
              {busy ? <Spinner size={14} /> : <Icon name='trash' size={14} />}
              确认删除
            </button>
          </>
        }
      >
        <p className='text-sm leading-relaxed text-white/60'>
          确定要删除应用 <span className='font-medium text-cream'>{items.find((i) => i.id === confirmId)?.name}</span> 吗？
        </p>
      </Modal>
    </div>
  );
}

