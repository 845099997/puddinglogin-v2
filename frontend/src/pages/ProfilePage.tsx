import { useState } from 'react';
import Icon from '../components/Icon';
import { post, type User } from '../lib/api';
import { cx, Field, Spinner, useToast } from '../lib/ui';

export default function ProfilePage({ user, onUser }: { user: User; onUser: (u: User | null) => void }) {
  const toast = useToast();
  const [nickname, setNickname] = useState(user.nickname || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    const res = await post<{ user: User }>('profile', { nickname: nickname.trim(), avatar: avatar.trim() });
    setSavingProfile(false);
    if (res.code === 0 && res.data) {
      onUser(res.data.user);
      toast.push('success', res.msg || '资料已更新');
    } else {
      toast.push('error', res.msg || '保存失败');
    }
  };

  const savePwd = async () => {
    if (savingPwd) return;
    if (newPwd !== newPwd2) {
      toast.push('error', '两次输入的新密码不一致');
      return;
    }
    setSavingPwd(true);
    const res = await post('password', { old_password: oldPwd, password: newPwd, password2: newPwd2 });
    setSavingPwd(false);
    if (res.code === 0) {
      toast.push('success', res.msg || '密码修改成功');
      setOldPwd('');
      setNewPwd('');
      setNewPwd2('');
    } else {
      toast.push('error', res.msg || '密码修改失败');
    }
  };

  const initial = (user.nickname || user.username || 'P').slice(0, 1).toUpperCase();

  return (
    <div className='mx-auto w-full max-w-5xl space-y-6'>
      <section className='relative overflow-hidden rounded-3xl border border-white/10 bg-mesh p-6 shadow-card sm:p-8'>
        <div className='relative flex flex-col gap-6 sm:flex-row sm:items-center'>
          <div className='relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-white/15 bg-ink-950/60 text-2xl font-semibold text-cream'>
            {user.avatar ? (
              <img src={user.avatar} alt={user.nickname} className='h-full w-full object-cover' referrerPolicy='no-referrer' />
            ) : (
              <div className='flex h-full w-full items-center justify-center'>{initial}</div>
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-2xl font-semibold text-cream'>{user.nickname || user.username}</h1>
            <p className='mt-1 text-sm text-white/50'>@{user.username} · UID {user.uid}</p>
            <div className='mt-4 flex flex-wrap gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60'>
                <Icon name='mail' size={13} />
                {user.email || '未绑定邮箱'}
              </span>
              <span className='inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60'>
                <Icon name='phone' size={13} />
                {user.phone || '未绑定手机'}
              </span>
              <span className='inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60'>
                <Icon name='shield' size={13} />
                账号状态 {user.status === 1 ? '正常' : '已禁用'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className='grid gap-6 lg:grid-cols-2'>
        <section className='rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft'>
          <div className='flex items-center gap-2'>
            <Icon name='user' size={18} className='text-pudding-300' />
            <h2 className='text-base font-semibold text-cream'>基础资料</h2>
          </div>
          <p className='mt-1 text-xs text-white/40'>昵称会展示在控制台与登录欢迎语中</p>
          <div className='mt-5 space-y-4'>
            <Field label='昵称'>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
                placeholder='请输入昵称'
                className='w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
            </Field>
            <Field label='头像地址' hint={<span className='text-[11px] text-white/30'>http(s) 链接</span>}>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder='https://example.com/avatar.png'
                className='w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 font-mono text-xs text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
            </Field>
            <button
              type='button'
              onClick={saveProfile}
              disabled={savingProfile}
              className='inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pudding-gradient px-5 py-3 text-sm font-semibold text-on-pudding transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60'
            >
              {savingProfile ? <Spinner size={14} /> : <Icon name='check' size={15} />}
              保存资料
            </button>
          </div>
        </section>

        <section className='rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Icon name='lock' size={18} className='text-berry-300' />
              <h2 className='text-base font-semibold text-cream'>修改密码</h2>
            </div>
            <button
              type='button'
              onClick={() => setShowPwd((v) => !v)}
              className='inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white'
            >
              <Icon name={showPwd ? 'eye-off' : 'eye'} size={13} />
              {showPwd ? '隐藏' : '显示'}
            </button>
          </div>
          <p className='mt-1 text-xs text-white/40'>密码使用 bcrypt 加密存储，修改后需重新登录其他设备</p>
          <div className='mt-5 space-y-4'>
            <Field label='当前密码'>
              <input
                type={showPwd ? 'text' : 'password'}
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                autoComplete='current-password'
                placeholder='请输入当前密码'
                className='w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
            </Field>
            <Field label='新密码' hint={<span className='text-[11px] text-white/30'>6-64 位，不能纯数字</span>}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete='new-password'
                placeholder='请输入新密码'
                className='w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
            </Field>
            <Field label='确认新密码' error={newPwd2 && newPwd !== newPwd2 ? '两次输入不一致' : ''}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={newPwd2}
                onChange={(e) => setNewPwd2(e.target.value)}
                autoComplete='new-password'
                placeholder='请再次输入新密码'
                className='w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-cream outline-none transition placeholder:text-white/25 focus:border-pudding-300/60 focus:bg-white/8'
              />
            </Field>
            <button
              type='button'
              onClick={savePwd}
              disabled={savingPwd || !oldPwd || !newPwd || !newPwd2}
              className={cx(
                'inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition',
                'border-white/12 bg-white/8 text-cream hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40'
              )}
            >
              {savingPwd ? <Spinner size={14} /> : <Icon name='shield' size={15} />}
              更新密码
            </button>
          </div>
        </section>
      </div>

      <section className='rounded-3xl border border-white/10 bg-ink-850/80 p-6 shadow-soft'>
        <h2 className='text-base font-semibold text-cream'>账号信息</h2>
        <dl className='mt-4 grid gap-3 sm:grid-cols-2'>
          {[
            { k: '注册时间', v: user.addtime || '-' },
            { k: '最近登录', v: user.lasttime || '-' },
            { k: '最近 IP', v: user.lastip || '-' },
            { k: '用户组', v: 'UID 组 ' + user.gid },
          ].map((r) => (
            <div key={r.k} className='flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3'>
              <dt className='text-xs text-white/40'>{r.k}</dt>
              <dd className='ml-3 truncate font-mono text-xs text-cream/80'>{r.v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

