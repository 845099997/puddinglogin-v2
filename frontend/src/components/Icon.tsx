import type { SVGProps } from 'react';

export type IconName =
  | 'qq' | 'wechat' | 'alipay'
  | 'baidu' | 'weibo' | 'dingtalk' | 'xiaomi' | 'huawei'
  | 'github' | 'gitee' | 'google' | 'facebook' | 'twitter' | 'microsoft'
  | 'dashboard' | 'apps' | 'accounts' | 'logs' | 'profile' | 'logout'
  | 'plus' | 'copy' | 'check' | 'close' | 'trash' | 'refresh' | 'external'
  | 'mail' | 'phone' | 'lock' | 'user' | 'arrow-right' | 'arrow-left'
  | 'sparkle' | 'shield' | 'code' | 'edit' | 'chart' | 'eye' | 'eye-off' | 'power' | 'menu' | 'search' | 'link' | 'calendar'
  | 'sun' | 'moon';

export default function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };

  switch (name) {
    case 'qq':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
          <path d="M12 2c-3.1 0-5.2 2.3-5.2 5.4 0 .6.1 1.2.2 1.7-.7.9-1.3 2-1.3 3.1 0 .5.1.9.3 1.2-.4.7-.7 1.5-.7 2.2 0 .6.2 1.1.6 1.4-.3.6-.4 1.2-.4 1.7 0 1.3.9 2.1 2.2 2.1.7 0 1.4-.2 2-.6.7.2 1.5.3 2.3.3s1.6-.1 2.3-.3c.6.4 1.3.6 2 .6 1.3 0 2.2-.8 2.2-2.1 0-.5-.1-1.1-.4-1.7.4-.3.6-.8.6-1.4 0-.7-.3-1.5-.7-2.2.2-.3.3-.7.3-1.2 0-1.1-.6-2.2-1.3-3.1.1-.5.2-1.1.2-1.7C17.2 4.3 15.1 2 12 2Z" />
          <ellipse cx="9.6" cy="9.4" rx="1" ry="1.4" fill="#0A0B14" />
          <ellipse cx="14.4" cy="9.4" rx="1" ry="1.4" fill="#0A0B14" />
        </svg>
      );
    case 'wechat':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
          <path d="M9.2 3.2C5.2 3.2 2 5.9 2 9.2c0 1.9 1 3.5 2.7 4.7l-.7 2.1 2.4-1.2c.8.2 1.7.4 2.6.4h.5c-.2-.5-.3-1-.3-1.6 0-3.2 3-5.8 6.8-5.8h.6C15.9 5.1 12.8 3.2 9.2 3.2Z" />
          <path d="M22 13.6c0-2.7-2.7-4.9-5.9-4.9s-5.9 2.2-5.9 4.9 2.7 4.9 5.9 4.9c.7 0 1.4-.1 2-.3l1.9 1-.5-1.7c1.5-.9 2.5-2.3 2.5-3.9Z" />
          <circle cx="7.3" cy="8.1" r="0.95" fill="#0A0B14" />
          <circle cx="11.4" cy="8.1" r="0.95" fill="#0A0B14" />
          <circle cx="14.2" cy="12.6" r="0.8" fill="#0A0B14" />
          <circle cx="18" cy="12.6" r="0.8" fill="#0A0B14" />
        </svg>
      );
    case 'alipay':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
          <path d="M4.6 3h14.8A1.6 1.6 0 0 1 21 4.6v14.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 19.4V4.6A1.6 1.6 0 0 1 4.6 3Zm3.1 15.2h8.2v-1.5H7.7v1.5Zm-.3-3.3c1.6-.4 3.2-1.1 4.5-2.1-.9-1-1.6-2.1-2.1-3.3H7.3V8.2H11V6.9H8.9V5.7h5.1v1.2h-2v1.3h3v1.3h-1.4c.3.8.8 1.5 1.3 2.2.7-.5 1.3-1 1.8-1.6l1 .9c-.6.7-1.3 1.3-2.1 1.9.9.9 1.9 1.7 3 2.3l-1 1.2c-1.1-.7-2.1-1.5-2.9-2.4-1.4 1.1-3.1 1.9-5 2.3l-.6-1.2Z" />
        </svg>
      );
    case 'dashboard':
      return (<svg {...common}><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></svg>);
    case 'apps':
      return (<svg {...common}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" /><path d="M4 9h16M8.5 5v16" /></svg>);
    case 'accounts':
      return (<svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19.5c0-2.9 2.5-5 5.5-5s5.5 2.1 5.5 5" /><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.8c1.8.5 3 2.2 3 4.2" /></svg>);
    case 'logs':
      return (<svg {...common}><path d="M6 3.5h9.5L20 8v12.5H6z" /><path d="M15 3.5V8h4.5M9.5 12.5h7M9.5 16.5h4.5" /></svg>);
    case 'profile':
      return (<svg {...common}><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6" /></svg>);
    case 'logout':
      return (<svg {...common}><path d="M15 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H15" /><path d="M18 12H9.5M15.5 8.5 19 12l-3.5 3.5" /></svg>);
    case 'plus':
      return (<svg {...common}><path d="M12 5v14M5 12h14" /></svg>);
    case 'copy':
      return (<svg {...common}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 5.5H7A2.5 2.5 0 0 0 4.5 8v8.5" /></svg>);
    case 'check':
      return (<svg {...common}><path d="M4.5 12.5 9.5 17.5 19.5 6.5" /></svg>);
    case 'close':
      return (<svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>);
    case 'trash':
      return (<svg {...common}><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.5 7" /><path d="M10.5 11v5M13.5 11v5" /></svg>);
    case 'refresh':
      return (<svg {...common}><path d="M20 11.5A8 8 0 0 0 6.5 6.2L4 8.7" /><path d="M4 4.5v4.2h4.2M4 12.5A8 8 0 0 0 17.5 17.8L20 15.3" /><path d="M20 19.5v-4.2h-4.2" /></svg>);
    case 'external':
      return (<svg {...common}><path d="M13.5 5.5H18.5V10.5M18 6 11 13" /><path d="M17 14v4.5A1.5 1.5 0 0 1 15.5 20H5.5A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10" /></svg>);
    case 'mail':
      return (<svg {...common}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>);
    case 'phone':
      return (<svg {...common}><rect x="7" y="2.5" width="10" height="19" rx="2.6" /><path d="M10.8 18.5h2.4" /></svg>);
    case 'lock':
      return (<svg {...common}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /></svg>);
    case 'user':
      return (<svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" /></svg>);
    case 'arrow-right':
      return (<svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
    case 'arrow-left':
      return (<svg {...common}><path d="M19 12H5M11 18 5 12l6-6" /></svg>);
    case 'sparkle':
      return (<svg {...common}><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z" /><path d="M18.5 4.5 19.2 6.7 21.5 7.4 19.2 8.1 18.5 10.3 17.8 8.1 15.5 7.4 17.8 6.7z" /></svg>);
    case 'shield':
      return (<svg {...common}><path d="M12 3.2 19.5 6v6.2c0 4.2-3.1 7.3-7.5 8.6-4.4-1.3-7.5-4.4-7.5-8.6V6z" /><path d="m9 12 2.2 2.2L15.4 10" /></svg>);
    case 'code':
      return (<svg {...common}><path d="m8.5 8.5-4 3.5 4 3.5M15.5 8.5l4 3.5-4 3.5M13.5 5 10.5 19" /></svg>);
    case 'chart':
      return (<svg {...common}><path d="M4 19.5V13M9.3 19.5V6.5M14.7 19.5v-8M20 19.5V9" /></svg>);
    case 'eye':
      return (<svg {...common}><path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
    case 'eye-off':
      return (<svg {...common}><path d="M4 4l16 16" /><path d="M9.5 6.3A9.6 9.6 0 0 1 12 5.8c5.6 0 9.2 6.2 9.2 6.2a16 16 0 0 1-3.2 3.9M6.3 8.1A16.5 16.5 0 0 0 2.8 12S6.4 18.2 12 18.2c1 0 2-.2 2.8-.5" /></svg>);
    case 'power':
      return (<svg {...common}><path d="M12 3.5V11" /><path d="M7.2 6.5a7 7 0 1 0 9.6 0" /></svg>);
    case 'menu':
      return (<svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
    case 'search':
      return (<svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>);
    case 'link':
      return (<svg {...common}><path d="M10 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.4 6.4" /><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.2-1.2" /></svg>);
    case 'calendar':
      return (<svg {...common}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>);
    case 'baidu':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M6.3 9.8c1.2-.3 2 .6 2.2 1.9.2 1.3-.4 2.6-1.6 2.9-1.2.3-2-.6-2.2-1.9-.2-1.3.4-2.6 1.6-2.9Zm4-3.6c1.3 0 2.1 1.2 2.1 2.6 0 1.4-.8 2.6-2.1 2.6s-2.1-1.2-2.1-2.6c0-1.4.8-2.6 2.1-2.6Zm5.6 1.1c1.1.2 1.6 1.4 1.4 2.7-.2 1.3-1.1 2.1-2.2 1.9-1.1-.2-1.6-1.4-1.4-2.7.2-1.3 1.1-2.1 2.2-1.9Zm3.6 3.4c1.1.3 1.5 1.6 1.1 2.9-.4 1.2-1.6 1.8-2.6 1.5-1.1-.3-1.5-1.6-1.1-2.9.4-1.2 1.6-1.8 2.6-1.5ZM12 13.6c2.6 0 5 1.3 5 3.6 0 1.9-1.6 3.1-3.5 3.1-.6 0-1-.2-1.5-.2s-.9.2-1.5.2c-1.9 0-3.5-1.2-3.5-3.1 0-2.3 2.4-3.6 5-3.6Z" /></svg>);
    case 'weibo':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M10.2 19.6c-4.3 0-7.4-2.1-7.4-4.7 0-1.6 1.2-3.4 3.2-4.8C9 8.2 11.9 7.6 13 8.5c.5.4.6 1.1.3 2 0 .1 0 .2.1.2 1.4-.6 2.6-.7 3.1-.1.4.5.3 1.3-.1 2.2-.1.2 0 .3.1.3 1.1.4 1.6 1.1 1.6 1.9 0 2.3-3.6 4.6-7.9 4.6Zm-.4-2.2c2.3 0 4.2-1.1 4.2-2.5s-1.9-2.5-4.2-2.5-4.2 1.1-4.2 2.5 1.9 2.5 4.2 2.5Zm-1.5-1.4c-.8 0-1.4-.5-1.4-1.1s.6-1.1 1.4-1.1 1.4.5 1.4 1.1-.6 1.1-1.4 1.1Zm9.3-8.1c.9.2 1.6 1 1.6 2 0 .4-.1.7-.2 1l-.9-.3c.1-.2.1-.4.1-.6 0-.6-.4-1.1-1-1.2l-.4-.1.1-1 .5.1Z" /></svg>);
    case 'dingtalk':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M12 2.4c5.3 0 9.6 4.3 9.6 9.6s-4.3 9.6-9.6 9.6S2.4 17.3 2.4 12 6.7 2.4 12 2.4Zm4.2 6c-.2-.4-.6-.5-1-.5h-6c-.3 0-.5.2-.5.5v.4c0 .3.2.5.5.5h3.6l-2.4 2.1c-.2.2-.2.5 0 .7l.3.3c.2.2.5.2.7 0l1.3-1.1c.9 1.2.7 2.2-.1 3.1-.9 1-2.5 1.6-4.2 1.6-.3 0-.4.1-.4.4v.4c0 .3.1.4.4.4 2.3 0 4.4-.8 5.6-2.2 1.1-1.3 1.3-2.8.4-4.2l2-1.6c.2-.2.2-.5.1-.7l-.3-.1Z" /></svg>);
    case 'xiaomi':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><rect x="2.5" y="6" width="19" height="12" rx="2.4" /><path d="M6.4 9.4h2.1v5.2H6.4Zm4 0h2l1.3 2.3V9.4h2.1v5.2h-1.9l-1.4-2.4v2.4h-2.1Zm6.4 0h3.4v1.6h-1.3v3.6h-2.1Z" fill="#0A0B14" /></svg>);
    case 'huawei':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M12 2.2c1.1 1 1.9 2.2 2.4 3.5-1.6-.6-3.2-.8-4.8 0 .5-1.3 1.3-2.5 2.4-3.5Zm-6.3 3c1.4.2 2.7.8 3.8 1.6-1.3 1-2.3 2.3-2.9 3.9-1-1.4-1.6-3.1-1.8-4.9-.1-.3 0-.5.2-.6Zm12.6 0c.2.1.3.3.2.6-.2 1.8-.8 3.5-1.8 4.9-.6-1.6-1.6-2.9-2.9-3.9 1.1-.8 2.4-1.4 3.8-1.6h.7ZM12 9.6c1.7 0 3.2.7 4.3 1.8-1.1 1.1-2.6 1.8-4.3 1.8s-3.2-.7-4.3-1.8c1.1-1.1 2.6-1.8 4.3-1.8Zm-6.9 2.6c.5 1.4 1.3 2.6 2.4 3.5-.7.9-1.6 1.6-2.7 2-.3-.6-.5-1.2-.6-1.9-.2-1.3 0-2.5.4-3.6h.5Zm13.8 0h.5c.4 1.1.6 2.3.4 3.6-.1.7-.3 1.3-.6 1.9-1.1-.4-2-1.1-2.7-2 1.1-.9 1.9-2.1 2.4-3.5ZM12 15.3c1.9 0 3.6.6 5 1.6-1.4 1-3.2 1.6-5 1.6s-3.6-.6-5-1.6c1.4-1 3.1-1.6 5-1.6Z" /></svg>);
    case 'github':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1 .8-.2 1.6-.3 2.5-.3s1.7.1 2.5.3c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2Z" /></svg>);
    case 'gitee':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M11.9 2.2a9.8 9.8 0 1 0 0 19.6c5.1 0 9.3-3.7 9.8-8.5h-9.2v3.1h5.6c-1 2.4-3.3 4.1-6.2 4.1a6.8 6.8 0 1 1 4.6-11.8l2.2-2.2a9.7 9.7 0 0 0-6.8-2.8Zm0 5.3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 4.4-3.5h-4.4v-2.9h7.3c.1.5.2.9.2 1.4" /></svg>);
    case 'google':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" /><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" /><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z" /><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1Z" /></svg>);
    case 'facebook':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" /></svg>);
    case 'twitter':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M17.2 3h3.3l-7.2 8.2L21.7 21h-6.6l-5.2-6.6L4 21H.7l7.7-8.8L.5 3h6.8l4.7 6.1L17.2 3Zm-1.2 16.1h1.8L6.1 4.8H4.2l11.8 14.3Z" /></svg>);
    case 'microsoft':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><rect x="2.5" y="2.5" width="8.6" height="8.6" /><rect x="12.9" y="2.5" width="8.6" height="8.6" /><rect x="2.5" y="12.9" width="8.6" height="8.6" /><rect x="12.9" y="12.9" width="8.6" height="8.6" /></svg>);
    case 'sun':
      return (<svg {...common}><circle cx='12' cy='12' r='4.2' /><path d='M12 2.6v2.4M12 19v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.6 12h2.4M19 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7' /></svg>);
    case 'moon':
      return (<svg {...common}><path d='M20.6 14.1A8.6 8.6 0 0 1 9.9 3.4a8.6 8.6 0 1 0 10.7 10.7Z' /></svg>);
    case 'edit':
      return (<svg {...common}><path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0 0-3l-1.2-1.2a2.1 2.1 0 0 0-3 0L4 15.8V20Z" /><path d="M13.8 6.2 17.8 10.2" /></svg>);
    default:
      return null;
  }
}

