/** app.js — 起動・ルート定義・初期データ読み込み */
import { isConfigured, isDemo } from './config.js';
import { sb } from './supabase.js';
import { currentUser, logout } from './auth.js';
import * as db from './db.js';
import { state, getPeekTarget, setPeekTarget, canEdit, resetSession, loadDraft, adoptDraft } from './state.js';
import { initOverlayEvents, snackbar, confirmDialog, $ } from './ui.js';
import { warmUpToken } from './googleCalendar.js';
import { initTheme } from './theme.js';
import { initKeyboardHandling } from './keyboard.js';
import { flushNow } from './autosave.js';
import { DEMO_PIN } from './demoData.js';
import { defineRoutes, startRouter, navigate, currentPath, routeRequiresUser } from './router.js';

import * as login from './views/login.js';
import * as home from './views/home.js';
import * as select from './views/select.js';
import * as confirmView from './views/confirm.js';
import * as session from './views/session.js';
import * as dashboard from './views/dashboard.js';
import * as guide from './views/guide.js';
import * as settings from './views/settings.js';

defineRoutes({
  '/login':     { title: 'ログイン',       tab: '',          view: login.render,       requiresUser: false },
  '/home':      { title: 'SCRUM FIT',      tab: 'home',      view: home.render,        requiresUser: true },
  '/select':    { title: 'メニュー選択',    tab: 'home',      view: select.render,      requiresUser: true, requiresAuth: true },
  '/confirm':   { title: '今回のプラン',    tab: 'home',      view: confirmView.render, requiresUser: true, requiresAuth: true },
  '/session':   { title: 'ワークアウト中',  tab: 'home',      view: session.render,     requiresUser: true, requiresAuth: true, teardown: session.teardown },
  '/dashboard': { title: '月間レポート',    tab: 'dashboard', view: dashboard.render,   requiresUser: true },
  '/guides':    { title: '種目解説',        tab: 'guides',    view: guide.render,       requiresUser: false },
  '/settings':  { title: '設定',            tab: 'settings',  view: settings.render,    requiresUser: false }
});

/** 種目一覧は全員共通なので、ログインしていなくても読める */
export async function loadCatalog(force = false) {
  if (force || !state.exercises.length) state.exercises = await db.loadExercises();
  return state.exercises;
}

/** 表示対象のユーザーに合わせて、必要なものをまとめて読み込む */
export async function bootstrap() {
  await loadCatalog();
  if (!state.profile) return;
  state.dashboard = await db.dashboard(state.profile.id);
  // カレンダー連携済みなら、終了時に待たされないようトークンを先に温めておく
  if (canEdit() && state.profile.calendar_id) warmUpToken();
  if (canEdit()) {
    state.workout = await db.activeWorkout(state.profile.id);
    if (state.workout) adoptDraft(state.workout);
  } else {
    state.workout = null;
  }
  paintNetState();
}

export function paintNetState() {
  const el = $('#netState');
  if (!isConfigured()) { setChip(el, '未設定', 'err', '接続設定を開く'); return; }
  if (!state.profile) { setChip(el, '未ログイン', '', 'ログイン画面を開く'); return; }
  const name = state.profile.display_name;
  const action = canEdit() ? `${name} さんからほかの人に切り替える` : 'ログインする';
  if (canEdit()) setChip(el, name, 'ok', action);
  else setChip(el, '覗き見: ' + name, 'peek', action);
}

/**
 * ユーザーを切り替える。設定画面のボタンと、上のバーの名前の両方から呼ぶ。
 * 入力中のものを先に保存してからログアウトし、ログイン画面へ戻す。
 * 戻った先で名前とPINを入れ直す手順は、ふだんの切り替えと同じ。
 */
export async function switchUser() {
  const active = Boolean(state.workout);
  const ok = await confirmDialog({
    headline: canEdit() ? 'ほかの人に切り替えますか？' : '別の人に切り替えますか？',
    body: active
      ? '実施中のワークアウトを保存してからログアウトします。'
        + '次に同じ名前でログインすれば、続きから再開できます。'
      : 'ログイン画面に戻ります。記録は残ります。'
        + '戻るときは名前を選んでPINを入れてください。',
    confirmLabel: '切り替える'
  });
  if (!ok) return false;

  // 入力途中のセットを取りこぼさないよう、先に書き込みきる
  try { await flushNow(); } catch { /* 保存できなくても切り替えは止めない */ }

  await logout();
  resetSession();
  login.reset();
  paintNetState();
  navigate('/login');
  return true;
}

/**
 * ダミーデータで動いていることを、見間違えようがない形で出す。
 * 本番そっくりの画面でダミーが出ていると、取り違えて判断を誤る。
 */
function showDemoBanner() {
  if (!isDemo() || document.querySelector('#demoBanner')) return;
  const el = document.createElement('div');
  el.id = 'demoBanner';
  el.textContent = `ダミーデータ（ローカル）／ PIN は ${DEMO_PIN} ／ 本番を見るには ?live=1`;
  document.body.prepend(el);
  document.body.classList.add('is-demo');
}

/** 上のバーの名前チップ。押したらユーザーを切り替える */
function bindNetStateChip() {
  const el = $('#netState');
  if (!el) return;
  const go = (ev) => {
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    if (!isConfigured()) return navigate('/settings');
    if (!state.profile) return navigate('/login');
    switchUser();
  };
  el.addEventListener('click', go);
  el.addEventListener('keydown', go);
}

function setChip(el, text, kind, action) {
  el.textContent = text;
  el.className = 'md-chip md-label-medium md-state '
    + (kind === 'ok' ? 'md-chip--tonal'
     : kind === 'peek' ? 'md-chip--peek'
     : kind === 'err' ? 'md-chip--error' : 'md-chip--static');
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', action || text);
  el.title = action || text;
}

/** 保存済みのセッション（本人）か、覗き見対象を復元する */
async function restoreSession() {
  const user = await currentUser();
  if (user) {
    const { data } = await sb().auth.getSession();
    state.session = data?.session || null;
    const own = await db.getProfile(user.id);
    if (!own) {                  // 認証だけ残ってプロフィールが無い異常系
      await sb().auth.signOut();
      state.session = null;
      return false;
    }
    // 承認をもらっている相手の記録を見ている最中なら、その人に切り替える。
    // セッションは自分のままなので canEdit() は false になり、書き込みはできない。
    const viewing = getPeekTarget();
    if (viewing && viewing !== user.id) {
      const other = await db.getProfile(viewing).catch(() => null);
      if (other) { state.profile = other; return true; }
      setPeekTarget(null);       // 許可を取り消された、などで読めなくなった
    }
    state.profile = own;
    return true;
  }
  // ログインしていなければ、何も見られない（記録はログイン必須になった）
  setPeekTarget(null);
  return false;
}

/** 承認をもらっている相手の記録に切り替える。null で自分に戻る */
export async function viewAs(profileId) {
  const me = state.session?.user?.id;
  if (!me) return false;
  if (!profileId || profileId === me) {
    setPeekTarget(null);
    state.profile = await db.getProfile(me);
  } else {
    const other = await db.getProfile(profileId);
    if (!other) throw new Error('この人の記録は見られません。承認が取り消された可能性があります。');
    setPeekTarget(profileId);
    state.profile = other;
  }
  state.dashboard = null;
  await bootstrap();
  paintNetState();
  return true;
}

async function init() {
  initTheme();
  initOverlayEvents();
  initKeyboardHandling();
  bindNetStateChip();
  showDemoBanner();

  if (!isConfigured()) {
    paintNetState();
    startRouter();
    if (currentPath() !== '/settings') navigate('/settings');
    return;
  }

  // セッションが切れたり更新されたときに画面を合わせる
  sb().auth.onAuthStateChange((event, session) => {
    state.session = session || null;
    if (event === 'SIGNED_OUT') {
      resetSession();
      paintNetState();
      navigate('/login');
    } else {
      paintNetState();
    }
  });

  // ルーターを動かす前にセッションを復元する。
  // 先にルーティングすると、復元が終わる前に「未ログイン」と判定されて
  // /login に書き換わり、リロード時に元の画面へ戻れなくなる。
  let restored = false;
  let failure = null;
  try {
    restored = await restoreSession();
    if (restored) {
      loadDraft();
      await bootstrap();
    }
  } catch (err) {
    failure = err;
  }
  paintNetState();
  startRouter();

  if (failure) {
    snackbar(failure.message, 'err');
    navigate(currentPath() === '/settings' ? '/settings' : '/login');
    return;
  }
  if (!restored) {
    // ログインが要らない画面（種目解説・設定）は、そのまま表示する。
    // すでに /login を表示しているときに navigate すると二重描画になる。
    if (routeRequiresUser(currentPath()) && currentPath() !== '/login') navigate('/login');
    return;
  }
  if (currentPath() === '/login') navigate('/home');
  if (state.workout && state.draft?.entries?.length) {
    snackbar('実施中のワークアウトを復元しました');
  }
}

init();
