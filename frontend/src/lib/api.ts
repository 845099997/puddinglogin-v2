export type ApiResp<T = unknown> = { code: number; msg: string; data?: T };

export type LoginType = { type: string; name: string; color: string; icon: string; enabled: boolean };

export type Site = {
  sitename: string;
  title: string;
  keywords: string;
  description: string;
  reg_open: boolean;
  reg_channel: 'both' | 'email' | 'phone';
  captcha_open_login: boolean;
  test_open: boolean;
  demo_on: boolean;
  demo_password_set: boolean;
  quick: { puddingchat: boolean; qq: boolean; wx: boolean; alipay: boolean };
  default_appid: string;
  kfqq: string;
  kfemail: string;
  icp: string;
  footer: string;
  siteurl: string;
  version: string;
  types: LoginType[];
};

export type User = {
  uid: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  money: number;
  gid: number;
  status: number;
  is_admin: number;
  addtime: string;
  lasttime: string;
  lastip: string;
  bound: { qq: boolean; wx: boolean; alipay: boolean };
};

export type AppItem = {
  id: number;
  appid: string;
  appkey: string;
  name: string;
  type: string;
  types?: string[];
  status: number;
  domain_limit: number;
  addtime: string;
  domains: string[];
};

export type Boot = { site: Site; csrf: string; user: User | null; base: string };

export const boot: Boot = ((window as any).__PL_BOOT__ || { csrf: '', user: null, base: '' }) as Boot;

let csrfToken: string = boot.csrf || '';

export function setCsrf(token: string | null | undefined) {
  if (token) csrfToken = token;
}

export function getCsrf() {
  return csrfToken;
}

async function request<T>(url: string, init: RequestInit): Promise<ApiResp<T>> {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return { code: -998, msg: '服务返回异常（HTTP ' + res.status + '）' };
    }
    if (json && json.data && json.data.csrf_token) setCsrf(json.data.csrf_token);
    return json as ApiResp<T>;
  } catch (e) {
    return { code: -999, msg: '网络异常，请检查连接后重试' };
  }
}

export function get<T = unknown>(act: string, params: Record<string, string | number> = {}) {
  const q = new URLSearchParams({ act });
  Object.keys(params).forEach((k) => q.set(k, String(params[k])));
  return request<T>('/api.php?' + q.toString(), { credentials: 'same-origin' });
}

export function post<T = unknown>(act: string, body: Record<string, string | number> = {}) {
  const q = new URLSearchParams({ act });
  const form = new URLSearchParams();
  form.set('csrf_token', csrfToken);
  Object.keys(body).forEach((k) => form.set(k, String(body[k])));
  return request<T>('/api.php?' + q.toString(), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form.toString(),
  });
}

export function upload<T = unknown>(act: string, file: File, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ act });
  const form = new FormData();
  form.set('csrf_token', csrfToken);
  Object.keys(extra).forEach((k) => form.set(k, extra[k]));
  form.set('file', file);
  return request<T>('/api.php?' + q.toString(), {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
}

export type PlatformItem = {
  type: string;
  name: string;
  icon: string;
  color: string;
  group: string;
  mode: 'official' | 'system' | 'rainbow' | string;
  status: number;
  sort: number;
  link: string;
  note: string;
  callback: string;
  appid: string;
  appkey_set: boolean;
  configured: boolean;
  components: number;
  logs: number;
};

export type PlatformAccount = {
  id: number;
  uid: number;
  username: string;
  social_uid: string;
  nickname: string;
  faceimg: string;
  addtime: string;
};

export type PlatformLog = {
  id: number;
  uid: number;
  username: string;
  type: string;
  date: string;
  ip: string;
  ua: string;
};

export type PlatformTestResult = {
  ok: boolean;
  stage: string;
  detail: string;
  url: string;
  elapsed_ms: number;
};

export type SettingShowIf = {
  label?: string;
  any?: Array<{ key: string; in: string[] }>;
};

export type SettingField = {
  label: string;
  kind: 'text' | 'textarea' | 'bool' | 'number' | 'select' | 'secret';
  placeholder?: string;
  desc?: string;
  mono?: boolean;
  options?: Record<string, string>;
  conf?: string;
  show_if?: SettingShowIf;
};

export type SettingGroup = {
  key: string;
  label: string;
  icon: string;
  desc: string;
  fields: number;
  actions: string[];
};

export function socialLabel(t: string) {
  if (t === 'qq') return 'QQ';
  if (t === 'wx') return '微信';
  if (t === 'alipay') return '支付宝';
  return t;
}

export function logLabel(t: string) {
  const map: Record<string, string> = {
    login: '账号登录',
    logout: '退出登录',
    register: '注册账号',
    resetpwd: '重置密码',
    change_password: '修改密码',
    update_profile: '更新资料',
    create_app: '创建应用',
    update_app: '更新应用',
    delete_app: '删除应用',
    reset_appkey: '重置密钥',
    oauth_qq: 'QQ 授权登录',
    oauth_wx: '微信授权登录',
    oauth_alipay: '支付宝授权登录',
    unbind_qq: '解绑 QQ',
    unbind_wx: '解绑微信',
    unbind_alipay: '解绑支付宝',
  };
  return map[t] || t;
}
