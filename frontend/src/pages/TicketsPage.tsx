import { useCallback, useEffect, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { get, post } from '../lib/api';
import { cx, Modal, Spinner, useToast } from '../lib/ui';

type TicketItem = {
  id: number;
  uid: number;
  title: string;
  category: string;
  status: number;
  replycount: number;
  lastreply: string;
  addtime: string;
  updatetime: string;
  username?: string;
  nickname?: string;
};

type TicketReply = {
  id: number;
  uid: number;
  role: string;
  content: string;
  addtime: string;
  username: string;
  nickname: string;
};

type Paged = { items: TicketItem[]; total: number; page: number; size: number };

export const CATEGORY_LABEL: Record<string, string> = {
  bug: '功能异常',
  account: '账号问题',
  billing: '支付与订单',
  feature: '功能建议',
  other: '其他问题',
};

export const STATUS_META: Record<number, { label: string; tone: string }> = {
  0: { label: '待处理', tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  1: { label: '处理中', tone: 'border-sky/30 bg-sky/10 text-sky' },
  2: { label: '已完成', tone: 'border-mint/30 bg-mint/10 text-mint' },
  3: { label: '已关闭', tone: 'border-white/15 bg-white/5 text-white/45' },
};

const FIELD_CLS =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8';

const ACT_CLS =
  'rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white';

export default function TicketsPage() {
  const toast = useToast();
  const [data, setData] = useState<Paged | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      get<Paged>('ticket.list', { page: p, size: 10 }).then((res) => {
        setLoading(false);
        if (res.code === 0 && res.data) setData(res.data);
        else toast.push('error', res.msg || '工单列表加载失败');
      });
    },
    [toast]
  );

  useEffect(() => {
    if (detailId > 0) return;
    load(page);
  }, [load, page, detailId]);

  async function submit() {
    if (submitting) return;
    if (title.trim().length < 4) {
      toast.push('error', '标题至少填写 4 个字');
      return;
    }
    if (content.trim().length < 5) {
      toast.push('error', '请具体描述问题（至少 5 个字）');
      return;
    }
    setSubmitting(true);
    const res = await post<{ id: number }>('ticket.create', {
      title: title.trim(),
      category,
      content: content.trim(),
    });
    setSubmitting(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '提交失败');
      return;
    }
    toast.push('success', res.msg || '工单已提交');
    setOpenCreate(false);
    setTitle('');
    setCategory('other');
    setContent('');
    setPage(1);
    load(1);
  }

  if (detailId > 0) {
    return (
      <TicketDetail
        id={detailId}
        onBack={() => {
          setDetailId(0);
          load(page);
        }}
      />
    );
  }

  const total = data?.total ?? 0;
  const size = data?.size ?? 10;
  const pages = Math.max(1, Math.ceil(total / size));
  const items = data?.items ?? [];
  const pending = items.filter((i) => i.status === 0 || i.status === 1).length;

  return (
    <div className='space-y-5'>
      <section className='rounded-3xl border border-white/10 bg-ink-850/70 shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4'>
          <div>
            <h2 className='text-base font-semibold text-cream'>我的工单</h2>
            <p className='mt-1 text-[12px] text-white/40'>
              共 {total} 个工单 · 当前页进行中 {pending} 个
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => load(page)}
              className='inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              <Icon name='refresh' size={14} />
              刷新
            </button>
            <button
              type='button'
              onClick={() => setOpenCreate(true)}
              className='inline-flex items-center gap-2 rounded-xl bg-pudding-gradient px-3.5 py-2 text-xs font-semibold text-on-pudding transition hover:brightness-105'
            >
              <Icon name='plus' size={14} />
              提交工单
            </button>
          </div>
        </div>

        <div className='divide-y divide-white/6'>
          {loading ? (
            <div className='flex items-center justify-center gap-2 py-12 text-sm text-white/40'>
              <Spinner size={16} />
              正在读取工单…
            </div>
          ) : items.length === 0 ? (
            <div className='py-14 text-center'>
              <p className='text-sm text-white/35'>还没有工单</p>
              <button
                type='button'
                onClick={() => setOpenCreate(true)}
                className='mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white'
              >
                <Icon name='plus' size={13} /> 提交第一个工单
              </button>
            </div>
          ) : (
            items.map((it) => {
              const meta = STATUS_META[it.status] || STATUS_META[0];
              return (
                <button
                  key={it.id}
                  type='button'
                  onClick={() => setDetailId(it.id)}
                  className='flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.03]'
                >
                  <span
                    className={cx(
                      'inline-flex shrink-0 rounded-lg border px-2 py-1 text-[11px]',
                      meta.tone
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className='flex min-w-[160px] flex-1 items-center gap-2'>
                    <span className='truncate text-sm font-medium text-cream'>{it.title}</span>
                    {it.lastreply === 'admin' ? (
                      <span className='shrink-0 rounded-md border border-berry-400/25 bg-berry-400/10 px-1.5 py-0.5 text-[10px] text-berry-200'>
                        有新回复
                      </span>
                    ) : null}
                  </span>
                  <span className='w-[96px] shrink-0 truncate text-[11.5px] text-white/40'>
                    {CATEGORY_LABEL[it.category] || '其他问题'}
                  </span>
                  <span className='w-[72px] shrink-0 text-[11.5px] text-white/35'>{it.replycount} 条回复</span>
                  <span className='w-[130px] shrink-0 text-[11px] text-white/30'>{it.updatetime || it.addtime}</span>
                  <Icon name='arrow-right' size={14} className='shrink-0 text-white/25' />
                </button>
              );
            })
          )}
        </div>

        {total > size ? (
          <div className='flex items-center justify-between border-t border-white/8 px-5 py-3 text-[11.5px] text-white/35'>
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
        ) : null}
      </section>

      <section className='rounded-3xl border border-white/10 bg-ink-850/60 p-5'>
        <p className='text-[12px] leading-relaxed text-white/40'>
          说明：提交工单后我们会尽快处理，处理进展会在工单内以对话形式回复。每个账号最多同时保有 5 个未完成工单；工单处理完成后可继续追问，问题解决后可自行关闭。
        </p>
      </section>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title='提交工单' subtitle='请尽量描述清楚问题，便于快速定位'>
        <div className='space-y-4'>
          <label className='block'>
            <span className='mb-1.5 block text-[12px] text-white/45'>工单标题</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='一句话概括问题，例如「邮箱验证码收不到」'
              className={FIELD_CLS}
            />
          </label>
          <label className='block'>
            <span className='mb-1.5 block text-[12px] text-white/45'>问题分类</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD_CLS}>
              {Object.keys(CATEGORY_LABEL).map((k) => (
                <option key={k} value={k} className='bg-ink-850'>
                  {CATEGORY_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className='block'>
            <span className='mb-1.5 block text-[12px] text-white/45'>问题描述</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder='请描述具体的操作步骤、出现的提示信息、发生时间等'
              className={cx(FIELD_CLS, 'resize-y leading-relaxed')}
            />
          </label>
          <div className='flex items-center justify-end gap-2 pt-1'>
            <button
              type='button'
              onClick={() => setOpenCreate(false)}
              className='rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10'
            >
              取消
            </button>
            <button
              type='button'
              onClick={submit}
              disabled={submitting}
              className='inline-flex items-center gap-2 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
            >
              {submitting ? <Spinner size={14} /> : <Icon name='check' size={14} />}
              提交工单
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function TicketDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const toast = useToast();
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    get<{ ticket: TicketItem; replies: TicketReply[] }>('ticket.detail', { id }).then((res) => {
      setLoading(false);
      if (res.code === 0 && res.data) {
        setTicket(res.data.ticket);
        setReplies(res.data.replies || []);
      } else {
        toast.push('error', res.msg || '工单读取失败');
      }
    });
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (busy) return;
    if (text.trim() === '') {
      toast.push('error', '回复内容不能为空');
      return;
    }
    setBusy(true);
    const res = await post<{ id: number; status: number }>('ticket.reply', { id, content: text.trim() });
    setBusy(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '回复失败');
      return;
    }
    setText('');
    toast.push('success', res.msg || '回复已提交');
    load();
  }

  async function closeTicket() {
    if (busy) return;
    setBusy(true);
    const res = await post<{ id: number; status: number }>('ticket.close', { id });
    setBusy(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '关闭失败');
      return;
    }
    toast.push('success', res.msg || '工单已关闭');
    load();
  }

  const meta = ticket ? STATUS_META[ticket.status] || STATUS_META[0] : STATUS_META[0];
  const canReply = ticket !== null && ticket.status !== 3;

  return (
    <div className='space-y-5'>
      <section className='rounded-3xl border border-white/10 bg-ink-850/70 shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <button
              type='button'
              onClick={onBack}
              className='rounded-xl border border-white/12 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
              aria-label='返回工单列表'
            >
              <Icon name='arrow-left' size={16} />
            </button>
            <div className='min-w-0'>
              <h2 className='truncate text-base font-semibold text-cream'>{ticket?.title || '工单详情'}</h2>
              <p className='mt-0.5 truncate text-[11.5px] text-white/40'>
                工单 #{id}
                {ticket ? ' · ' + (CATEGORY_LABEL[ticket.category] || '其他问题') : ''}
                {ticket ? ' · ' + (ticket.addtime || '') : ''}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <span className={cx('inline-flex rounded-lg border px-2.5 py-1 text-[11px]', meta.tone)}>{meta.label}</span>
            {canReply ? (
              <button type='button' onClick={closeTicket} disabled={busy} className={ACT_CLS}>
                关闭工单
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className='flex items-center justify-center gap-2 py-12 text-sm text-white/40'>
            <Spinner size={16} />
            正在读取工单…
          </div>
        ) : (
          <div className='space-y-4 px-5 py-5'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5'>
              <div className='mb-2 flex items-center gap-2 text-[11.5px] text-white/35'>
                <Icon name='user' size={13} />
                我提交的问题
              </div>
              <p className='whitespace-pre-wrap text-[13px] leading-relaxed text-white/75'>{ticket?.title}</p>
              {ticket && 'content' in ticket ? (
                <p className='mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/55'>
                  {(ticket as unknown as { content?: string }).content}
                </p>
              ) : null}
            </div>

            {replies.map((r) => (
              <div
                key={r.id}
                className={cx(
                  'rounded-2xl border px-4 py-3.5',
                  r.role === 'admin'
                    ? 'border-pudding-300/25 bg-pudding-300/8'
                    : 'border-white/10 bg-white/[0.03]'
                )}
              >
                <div className='mb-2 flex items-center gap-2 text-[11.5px] text-white/40'>
                  <Icon name={r.role === 'admin' ? 'shield' : 'user'} size={13} />
                  {r.role === 'admin' ? '官方客服' : r.nickname || r.username || '我'}
                  <span className='text-white/25'>· {r.addtime}</span>
                </div>
                <p className='whitespace-pre-wrap text-[13px] leading-relaxed text-white/75'>{r.content}</p>
              </div>
            ))}

            {ticket && ticket.status === 3 ? (
              <p className='rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[12px] text-white/35'>
                该工单已关闭，如需继续沟通请新建工单。
              </p>
            ) : (
              <div className='space-y-2'>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder='补充说明或追问…'
                  className={cx(FIELD_CLS, 'resize-y leading-relaxed')}
                />
                <div className='flex items-center justify-end'>
                  <button
                    type='button'
                    onClick={send}
                    disabled={busy}
                    className='inline-flex items-center gap-2 rounded-xl bg-pudding-gradient px-5 py-2.5 text-sm font-semibold text-on-pudding transition hover:brightness-105 disabled:opacity-60'
                  >
                    {busy ? <Spinner size={14} /> : <Icon name='arrow-right' size={14} />}
                    发送
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

