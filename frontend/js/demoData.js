/**
 * demoData.js — ローカルで動かすときのダミーデータ
 *
 * 【なぜ要るか】
 *   config.js には本番の接続先が入っている。ローカルサーバーは frontend/ を
 *   そのまま配るので、何もしなければローカルで本番のデータが見えてしまう。
 *   開発中に本番を触る理由はないので、localhost では必ずこちらに切り替える。
 *
 * Supabase クライアントのうち、アプリが使う分だけを真似た入れ物。
 * 日付は「今日」から逆算して作るので、いつ開いても最近の記録に見える。
 */

export const DEMO_PIN = '000000';
const UID = 'demo-user';
const FRIEND = 'demo-friend';   // 承認のやり取りを試すための相手
const STRANGER = 'demo-other';  // まだ関わりの無い人

const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** 今日から n 日前 */
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const at = (dayAgo, h, m) => {
  const d = new Date(); d.setDate(d.getDate() - dayAgo); d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/* --- 種目 ---------------------------------------------------------------- */
const CATALOG = [
  ['胸', 'ベンチプレス', 'バーベル', ['大胸筋'], ['上腕三頭筋', '三角筋']],
  ['胸', 'インクラインダンベルプレス', 'ダンベル', ['大胸筋'], ['三角筋', '上腕三頭筋']],
  ['胸', 'ケーブルフライ', 'ケーブル', ['大胸筋'], ['前鋸筋']],
  ['背中', 'ラットプルダウン', 'マシン', ['広背筋'], ['上腕二頭筋', '大円筋', '腕橈骨筋']],
  ['背中', 'ベントオーバーロウ', 'バーベル', ['広背筋', '僧帽筋'], ['上腕二頭筋', '脊柱起立筋']],
  ['背中', 'デッドリフト', 'バーベル', ['脊柱起立筋', '大臀筋'], ['ハムストリングス', '僧帽筋', '前腕筋群']],
  ['背中', '懸垂', '自重', ['広背筋'], ['上腕二頭筋', '大円筋', '手指屈筋群']],
  ['肩', 'サイドレイズ', 'ダンベル', ['三角筋'], ['僧帽筋']],
  ['肩', 'ショルダープレス', 'ダンベル', ['三角筋'], ['上腕三頭筋']],
  ['腕', 'バーベルカール', 'バーベル', ['上腕二頭筋'], ['上腕筋', '腕橈骨筋']],
  ['腕', 'ケーブルプレスダウン', 'ケーブル', ['上腕三頭筋'], []],
  ['腹', 'アブローラー', '自重', ['腹直筋'], ['腹斜筋', '広背筋']],
  ['脚', 'スクワット', 'バーベル', ['大腿四頭筋', '大臀筋'], ['ハムストリングス', '脊柱起立筋']],
  ['脚', 'レッグプレス', 'マシン', ['大腿四頭筋'], ['大臀筋', '下腿三頭筋']]
];

/* --- ワークアウト --------------------------------------------------------
   [何日前, 開始時, 分, メモ, [[部位, 種目, [[重量, レップ, RPE, ウォームアップ?, MAX?]]]]] */
const PLAN = [
  [2, 19, 76, 'ベンチ85kgで10レップ。腰が少し張る。', [
    ['胸', 'ベンチプレス', [[40, 12, null, true], [85, 10, 8], [85, 9, 9], [85, 8, 10]]],
    ['胸', 'インクラインダンベルプレス', [[32.5, 12, 8], [32.5, 10, 9]]],
    ['背中', 'ラットプルダウン', [[62.5, 12, 8], [62.5, 10, 9]]]]],
  [5, 7, 72, null, [
    ['脚', 'スクワット', [[60, 10, null, true], [120, 8, 9], [120, 7, 10], [110, 8, 9]]],
    ['脚', 'レッグプレス', [[180, 12, 8], [180, 10, 9]]]]],
  [9, 18, 48, '腰の張りが残ってる。今日は軽めに。', [
    ['肩', 'サイドレイズ', [[14, 15, 8], [14, 13, 9], [14, 11, 10]]],
    ['腕', 'バーベルカール', [[30, 12, 8], [30, 10, 9]]]]],
  [12, 10, 65, 'ジムのBGMがずっと同じ曲で笑った', [
    ['背中', 'デッドリフト', [[150, 5, 9], [150, 5, 10]]],
    ['背中', '懸垂', [[0, 10, 8, false, false], [10, 6, 9], [-20, 12, 8]]]]],
  [16, 19, 70, '寝不足。コーヒー飲みすぎた', [
    ['胸', 'ベンチプレス', [[82.5, 10, 8], [82.5, 9, 9], [95, 1, null, false, true]]]]],
  [20, 8, 58, '腰は大丈夫そう。スクワット調子いい。', [
    ['脚', 'スクワット', [[140, 1, null, false, true], [115, 8, 9]]]]],
  [27, 19, 64, null, [
    ['背中', 'ベントオーバーロウ', [[70, 10, 8], [70, 9, 9]]],
    ['腹', 'アブローラー', [[0, 12, 9]]]]],
  [41, 19, 60, null, [
    ['胸', 'ベンチプレス', [[80, 10, 8], [80, 9, 9], [80, 8, 10]]]]]
];

const BODY_WEIGHT = 72;

function build() {
  const exercises = CATALOG.map(([part, name, equipment, muscles, assist], i) => ({
    id: i + 1, part, name, equipment,
    rep_min: 8, rep_max: 12, default_sets: 3,
    sort_order: i, part_order: i, created_by: null, active: true,
    exercise_guides: {
      description: `${name}の解説（デモ用のダミーです）`,
      muscles, assist_muscles: assist, points: [], cautions: [], videos: [], tags: []
    }
  }));

  const workouts = [], sets = [], daily = [];
  let sid = 1;

  PLAN.forEach(([dayAgo, hour, minutes, memo, entries], wi) => {
    const date = ago(dayAgo);
    let volume = 0, count = 0;
    const parts = new Set();

    entries.forEach(([part, menu, rows]) => {
      parts.add(part);
      const gear = CATALOG.find((c) => c[1] === menu)?.[2] || '';
      const bw = gear === '自重' ? BODY_WEIGHT : null;
      let no = 0;
      rows.forEach(([weight, reps, rpe, warm, max]) => {
        if (!warm) no += 1;
        const eff = weight + (bw || 0);
        const vol = (warm || !reps) ? 0 : eff * reps;
        if (!warm && reps) { volume += vol; count += 1; }
        sets.push({
          id: sid++, workout_id: `demo-w${wi}`, user_id: UID, date, part, exercise: menu,
          set_no: warm ? 0 : no, weight, reps, rpe: rpe ?? null,
          is_warmup: Boolean(warm), is_max: Boolean(max), body_weight_used: bw,
          volume: vol,
          est_1rm: (warm || !reps) ? null : Math.round(eff * (1 + reps / 30) * 10) / 10
        });
      });
    });

    workouts.push({
      id: `demo-w${wi}`, user_id: UID, date, status: 'finished',
      started_at: at(dayAgo, hour, 0), ended_at: at(dayAgo, hour + Math.floor(minutes / 60), minutes % 60),
      duration_min: minutes, total_sets: count, total_volume: Math.round(volume * 10) / 10,
      rest_minutes: 2, memo, calendar_event_id: null
    });
    daily.push({
      user_id: UID, date, volume: Math.round(volume * 10) / 10,
      sets: count, parts: [...parts]
    });
  });

  return {
    exercises, workouts, workout_sets: sets, v_daily_volume: daily,
    v_exercise_monthly_best: [], v_exercise_max: [], user_private: [],
    // 閲覧許可。片方は承認待ち、片方は承認済みにして両方の見た目を確認できるように
    viewer_access: [
      { owner_id: UID, viewer_id: FRIEND, status: 'pending',
        requested_at: at(1, 9, 0), decided_at: null },
      { owner_id: FRIEND, viewer_id: UID, status: 'approved',
        requested_at: at(10, 9, 0), decided_at: at(9, 9, 0) }
    ],
    profiles: [
      { id: UID, display_name: 'デモ', auth_email: 'demo@example.invalid',
        weight_increment: 2.5, rest_minutes: 2, body_weight: BODY_WEIGHT,
        monthly_target_workouts: 12, monthly_target_volume: 40000,
        calendar_id: null, calendar_summary: null, last_login_at: at(2, 20, 30) },
      { id: FRIEND, display_name: 'デモ仲間', auth_email: 'friend@example.invalid',
        weight_increment: 2.5, rest_minutes: 3, body_weight: 65,
        monthly_target_workouts: 10, monthly_target_volume: 30000,
        calendar_id: null, calendar_summary: null, last_login_at: at(3, 18, 0) },
      { id: STRANGER, display_name: 'デモ他人', auth_email: 'other@example.invalid',
        weight_increment: 2.5, rest_minutes: 2, body_weight: 80,
        monthly_target_workouts: 8, monthly_target_volume: 20000,
        calendar_id: null, calendar_summary: null, last_login_at: at(30, 12, 0) }
    ]
  };
}

/* --- PostgREST のクエリビルダーを、使っているぶんだけ真似る --------------
   本物は .delete().eq(...) のように書いても、絞り込みをまとめて1本のクエリに
   するので順番を問わない。ここで素直に即時実行すると、delete() の時点で
   まだ絞り込まれておらず全件消えてしまう。
   そこで「何をするか」だけ覚えておき、await された時点でまとめて実行する。 */
function builder(tables, name) {
  let rows = (tables[name] || []).slice();
  let pending = null;              // null | 'delete' | { patch }

  const run = () => {
    if (pending === 'delete') {
      const t = tables[name] || [];
      rows.forEach((r) => { const i = t.indexOf(r); if (i >= 0) t.splice(i, 1); });
    } else if (pending && pending.patch) {
      rows.forEach((r) => Object.assign(r, pending.patch));
    }
    pending = null;
    return { data: rows, error: null };
  };

  const api = {
    select() { return api; },
    eq(c, v) { rows = rows.filter((r) => r[c] === v); return api; },
    neq(c, v) { rows = rows.filter((r) => r[c] !== v); return api; },
    gte(c, v) { rows = rows.filter((r) => r[c] >= v); return api; },
    lte(c, v) { rows = rows.filter((r) => r[c] <= v); return api; },
    in(c, v) { rows = rows.filter((r) => v.includes(r[c])); return api; },
    /** PostgREST の or。"a.eq.1,b.eq.2" のような書式だけ解釈する */
    or(expr) {
      const tests = String(expr).split(',').map((part) => {
        const [col, op, val] = part.split('.');
        return (r) => (op === 'eq' ? String(r[col]) === val : false);
      });
      rows = rows.filter((r) => tests.some((f) => f(r)));
      return api;
    },
    order(c, o) {
      const asc = !o || o.ascending !== false;
      rows.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      return api;
    },
    limit(n) { rows = rows.slice(0, n); return api; },
    insert(v) {
      const list = Array.isArray(v) ? v : [v];
      const t = tables[name] || (tables[name] = []);
      const made = list.map((o) => ({ id: o.id || `d${Math.random().toString(36).slice(2, 9)}`, ...o }));
      t.push(...made); rows = made; return api;
    },
    update(patch) { pending = { patch }; return api; },
    upsert(v) { return api.insert(v); },
    delete() { pending = 'delete'; return api; },
    maybeSingle() { const r = run(); return Promise.resolve({ data: r.data[0] || null, error: null }); },
    single()      { const r = run(); return Promise.resolve({ data: r.data[0] || null, error: null }); },
    then(res, rej) { return Promise.resolve(run()).then(res, rej); }
  };
  return api;
}

const SESSION_KEY = 'liftlog.demo.session';
const hasSession = () => { try { return localStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } };
const setSession = (on) => {
  try { on ? localStorage.setItem(SESSION_KEY, '1') : localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
};

/** 本物の代わりに渡すクライアント。ログインとログアウトもちゃんと動く */
export function demoClient() {
  const tables = build();
  const user = { id: UID, email: 'demo@example.invalid' };
  const session = () => (hasSession() ? { user } : null);
  const listeners = [];

  return {
    from: (name) => builder(tables, name),
    auth: {
      getUser:    () => Promise.resolve({ data: { user: session() ? user : null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: session() }, error: null }),
      signInWithPassword({ password }) {
        // 本物と同じく「PIN::アドレス」の形で来る
        if (!String(password || '').startsWith(DEMO_PIN + '::')) {
          return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
        }
        setSession(true);
        listeners.forEach((f) => f('SIGNED_IN', session()));
        return Promise.resolve({ data: { user, session: session() }, error: null });
      },
      signUp() {
        setSession(true);
        return Promise.resolve({ data: { user, session: session() }, error: null });
      },
      updateUser: () => Promise.resolve({ data: { user }, error: null }),
      signOut() {
        setSession(false);
        listeners.forEach((f) => f('SIGNED_OUT', null));
        return Promise.resolve({ error: null });
      },
      onAuthStateChange(fn) {
        listeners.push(fn);
        return { data: { subscription: { unsubscribe() { listeners.splice(listeners.indexOf(fn), 1); } } } };
      }
    }
  };
}
