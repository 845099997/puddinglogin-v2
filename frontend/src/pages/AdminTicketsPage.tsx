import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { get, post } from '../lib/api';
import { cx, Spinner, useToast } from '../lib/ui';

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
  username: string;
  nickname: string;
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

type Payload = {
  items: TicketItem[];
  total: number;
  page: number;
  size: number;
  stats: { pending: number; doing: number; done: number; closed: number };
};

const CATEGORY_LABEL: Record<string, string> = {
  bug: '功能异常',
  account: '账号问题',
  billing: '支付与订单',
  feature: '功能建议',
  other: '其他问题',
};

const STATUS_META: Record<number, { label: string; tone: string }> = {
  0: { label: '待处理', tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  1: { label: '处理中', tone: 'border-sky/30 bg-sky/10 text-sky' },
  2: { label: '已完成', tone: 'border-mint/30 bg-mint/10 text-mint' },
  3: { label: '已关闭', tone: 'border-white/15 bg-white/5 text-white/45' },
};

const FIELD_CLS =
  'w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8';

const ACT_CLS =
  'rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white';

export default function AdminTicketsPage() {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [kwInput, setKwInput] = useState('');
  const [kw, setKw] = useState('');
  const [detailId, setDetailId] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    get<Payload>('admin.ticket.list', { page, size: 10, status, kw }).then((res) => {
      setLoading(false);
      if (res.code === 0 && res.data) setData(res.data);
      else toast.push('error', res.msg || '工单列表加载失败');
    });
  }, [page, status, kw, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (detailId > 0) {
    return (
      <AdminTicketDetail
        id={detailId}
        onBack={() => {
          setDetailId(0);
          load();
        }}
      />
    );
  }

  const total = data?.total ?? 0;
  const size = data?.size ?? 10;
  const pages = Math.max(1, Math.ceil(total / size));
  const items = data?.items ?? [];
  const stats = data?.stats ?? { pending: 0, doing: 0, done: 0, closed: 0 };

  const filterTabs: Array<{ key: string; label: string; count: number }> = [
    { key: '', label: '全部', count: total },
    { key: '0', label: '待处理', count: stats.pending },
    { key: '1', label: '处理中', count: stats.doing },
    { key: '2', label: '已完成', count: stats.done },
    { key: '3', label: '已关闭', count: stats.closed },
  ];

  return (
    <div className='space-y-5'>
      <section className='rounded-3xl border border-white/10 bg-ink-850/70 shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4'>
          <div>
            <h2 className='text-base font-semibold text-cream'>工单管理</h2>
            <p className='mt-1 text-[12px] text-white/40'>
              共 {total} 个工单 · 待处理 {stats.pending} · 处理中 {stats.doing} · 已完成 {stats.done}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <input
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              placeholder='搜索标题 / 内容 / 用户'
              className='w-48 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-cream outline-none placeholder:text-white/25 focus:border-pudding-300/60'
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
            <button
              type='button'
              onClick={load}
              className='inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white'
            >
              <Icon name='refresh' size={14} />
              刷新
            </button>
          </div>
        </div>

        <div className='flex flex-wrap gap-1.5 border-b border-white/8 px-5 py-3'>
          {filterTabs.map((t) => (
            <button
              key={t.key || 'all'}
              type='button'
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] transition',
                status === t.key
                  ? 'border-white/15 bg-white/10 font-medium text-cream'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/8 hover:text-white/80'
              )}
            >
              {t.label}
              <span className='text-[10.5px] text-white/35'>{t.count}</span>
            </button>
          ))}
        </div>

        <div className='divide-y divide-white/6'>
          {loading ? (
            <div className='flex items-center justify-center gap-2 py-12 text-sm text-white/40'>
              <Spinner size={16} />
              正在读取工单…
            </div>
          ) : items.length === 0 ? (
            <p className='py-12 text-center text-sm text-white/35'>暂无工单</p>
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
                  <span className={cx('inline-flex shrink-0 rounded-lg border px-2 py-1 text-[11px]', meta.tone)}>
                    {meta.label}
                  </span>
                  <span className='flex min-w-[160px] flex-1 items-center gap-2'>
                    <span className='truncate text-sm font-medium text-cream'>#{it.id} {it.title}</span>
                    {it.lastreply === 'user' && it.status !== 3 ? (
                      <span className='shrink-0 rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-200'>
                        待回复
                      </span>
                    ) : null}
                  </span>
                  <span className='w-[110px] shrink-0 truncate text-[11.5px] text-white/45'>
                    {it.nickname || it.username || 'UID ' + it.uid}
                  </span>
                  <span className='w-[96px] shrink-0 truncate text-[11.5px] text-white/40'>
                    {CATEGORY_LABEL[it.category] || '其他问题'}
                  </span>
                  <span className='w-[72px] shrink-0 text-[11.5px] text-white/35'>{it.replycount} 条</span>
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
    </div>
  );
}

function AdminTicketDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const toast = useToast();
  const [ticket, setTicket] = useState<(TicketItem & { content?: string }) | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    get<{ ticket: TicketItem & { content?: string }; replies: TicketReply[] }>('admin.ticket.detail', { id }).then((res) => {
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
    const res = await post<{ id: number; status: number }>('admin.ticket.reply', { id, content: text.trim() });
    setBusy(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '回复失败');
      return;
    }
    setText('');
    toast.push('success', res.msg || '回复已提交');
    load();
  }

  async function changeStatus(next: number) {
    if (busy) return;
    setBusy(true);
    const res = await post<{ id: number; status: number }>('admin.ticket.status', { id, status: next });
    setBusy(false);
    if (res.code !== 0) {
      toast.push('error', res.msg || '状态更新失败');
      return;
    }
    toast.push('success', res.msg || '状态已更新');
    load();
  }

  const meta = ticket ? STATUS_META[ticket.status] || STATUS_META[0] : STATUS_META[0];

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
              <h2 className='truncate text-base font-semibold text-cream'>
                #{id} {ticket?.title || '工单详情'}
              </h2>
              <p className='mt-0.5 truncate text-[11.5px] text-white/40'>
                {ticket ? (ticket.nickname || ticket.username || 'UID ' + ticket.uid) + ' · ' : ''}
                {ticket ? CATEGORY_LABEL[ticket.category] || '其他问题' : ''}
                {ticket ? ' · ' + (ticket.addtime || '') : ''}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className={cx('inline-flex rounded-lg border px-2.5 py-1 text-[11px]', meta.tone)}>{meta.label}</span>
            <button type='button' className={ACT_CLS} disabled={busy} onClick={() => changeStatus(1)}>
              标记处理中
            </button>
            <button type='button' className={ACT_CLS} disabled={busy} onClick={() => changeStatus(2)}>
              标记已完成
            </button>
            <button type='button' className={ACT_CLS} disabled={busy} onClick={() => changeStatus(3)}>
              关闭工单
            </button>
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
                用户提交内容
              </div>
              <p className='whitespace-pre-wrap text-[13px] leading-relaxed text-white/80'>{ticket?.content || ''}</p>
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
                  {r.role === 'admin' ? '客服（' + (r.nickname || r.username || '管理员') + '）' : r.nickname || r.username || '用户'}
                  <span className='text-white/25'>· {r.addtime}</span>
                </div>
                <p className='whitespace-pre-wrap text-[13px] leading-relaxed text-white/75'>{r.content}</p>
              </div>
            ))}

            <div className='space-y-2'>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder='回复用户…'
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
                  回复并处理
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
