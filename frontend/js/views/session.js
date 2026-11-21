/** session.js — ワークアウト実行中の記録画面（経過時間 + 休憩タイマー + セット記録） */
import { state, saveDraft, clearDraft } from '../state.js';
import * as db from '../db.js';
import { startAutosave, stopAutosave, touch, flushNow, autosaveState } from '../autosave.js';
import { esc, icon, snackbar, confirmDialog, fmtNum, fmtDuration, fmtVolume, emptyState } from '../ui.js';
import { showGuide } from './guide.js';
import { openExercisePicker } from './exercisePicker.js';
import * as gcal from '../googleCalendar.js';
import { navigate } from '../router.js';
import { resetPicking } from './select.js';
import { restTimerHtml, startTicking, stopTicking, handleRestClick } from '../restTimer.js';
import { plateStrip } from '../plates.js';
import { RPE_OPTIONS, rpeChip, isMaxSet } from '../rpe.js';

let elapsedId = null;

export function render(root) {
  const draft = state.draft;
  if (!draft || draft.status !== 'active') {
    root.innerHTML = emptyState('timer', '実施中のワークアウトはありません。',
      '<a class="md-button md-button--filled md-state" href="#/select">ワークアウトを開始</a>');
    return;
  }

  paint(root);
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  startElapsed();
  startTicking(() => paintAndRebind(root));
  watchRestStick();

  // 10分ごと・入力の数秒後・画面を離れるときに Supabase へ自動保存する
  if (state.workout) {
    startAutosave({
      workoutId: state.workout.id,
      getDraft: () => state.draft,
      onState: paintAutosave
    });
  }
}

export function teardown() {
  if (elapsedId) { clearInterval(elapsedId); elapsedId = null; }
  stopTicking();
  stopAutosave();
  stopStickWatch();
}

/* --- 休憩タイマーの貼り付き判定 ---------------------------------------
   上に貼り付いているあいだは、分の増減まで出す必要がない。
   開始ボタン（計測中なら残り時間と停止）だけ残して、あとは畳む。
   画面を描き直しても効き続けるよう、都度 DOM を引き直す。 */
let stickWatch = null;

function watchRestStick() {
  if (stickWatch) return;
  let queued = false;
  const check = () => {
    queued = false;
    const el = document.querySelector('#restTimer');
    if (!el) return;
    const top = parseFloat(getComputedStyle(el).top) || 0;
    el.classList.toggle('is-stuck', el.getBoundingClientRect().top <= top + 1);
  };
  stickWatch = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
  window.addEventListener('scroll', stickWatch, { passive: true });
  window.addEventListener('resize', stickWatch, { passive: true });
  check();
}

function stopStickWatch() {
  if (!stickWatch) return;
  window.removeEventListener('scroll', stickWatch);
  window.removeEventListener('resize', stickWatch);
  stickWatch = null;
}

/** 自動保存の状態表示だけを差し替える（全体を再描画しない） */
function paintAutosave() {
  const el = document.querySelector('#autosave');
  if (el) el.outerHTML = autosaveHtml();
}

function autosaveHtml() {
  const { saving, dirty, lastSavedAt, lastError } = autosaveState();
  const label = lastError ? '保存できていません'
    : saving ? '保存中…'
    : lastSavedAt ? `${lastSavedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に自動保存`
    : dirty ? '未保存の入力があります'
    : '自動保存は有効です';
  const tone = lastError ? 'md-chip--error' : 'md-chip--static';
  return `<span class="md-chip ${tone} md-label-medium" id="autosave" title="10分ごと・入力の数秒後・画面を離れるときに保存します">
    ${icon(lastError ? 'error' : 'check', 'icon--sm')}${esc(label)}
  </span>`;
}

function startElapsed() {
  if (elapsedId) clearInterval(elapsedId);
  const startedAt = (() => {
    const t = new Date(state.draft?.startTime ?? state.workout?.started_at ?? Date.now()).getTime();
    return Number.isFinite(t) ? t : Date.now();
  })();
  const tick = () => {
    const el = document.querySelector('#elapsed');
    if (!el) { clearInterval(elapsedId); elapsedId = null; return; }
    el.textContent = fmtDuration(Date.now() - startedAt);
  };
  tick();
  elapsedId = setInterval(tick, 1000);
}

function paint(root) {
  const draft = state.draft;
  const totals = calcTotals(draft);

  root.innerHTML = `
    <div class="md-card md-card--elevated">
      <div class="ll-row ll-row--between">
        <div>
          <div class="ll-row" style="gap:10px;align-items:center">
            <span class="md-label-medium on-surface-variant">経過時間</span>
            <span class="ll-live">記録中</span>
          </div>
          <div class="ll-timer num" id="elapsed">00:00</div>
        </div>
        <div style="text-align:right">
          <div class="md-label-medium on-surface-variant">記録済みボリューム</div>
          <div class="md-headline-small num" id="totVolume">${fmtVolume(totals.volume)}</div>
          <div class="md-body-small on-surface-variant" id="totSets">${totals.sets} セット完了</div>
        </div>
      </div>
      <div style="margin-top:12px">${autosaveHtml()}</div>
    </div>

    ${restTimerHtml()}

    ${draft.entries.map((e, ei) => entryCard(e, ei)).join('')}

    <button class="md-button md-button--outlined md-button--block md-state" id="addExerciseBtn" style="margin-top:4px">
      ${icon('add')}種目を追加する
    </button>

    <div class="md-field" style="margin-top:24px">
      <textarea class="md-field__input" rows="2" data-act="memo" id="sessionMemo"
                placeholder="例：睡眠不足だが調子は良い">${esc(draft.memo || '')}</textarea>
      <label class="md-field__label" for="sessionMemo">今日のメモ（体調・気づき）</label>
    </div>

    <div class="ll-sticky-actions">
      <button class="md-button md-button--filled md-button--block md-button--tall md-state" id="finishBtn">
        ${icon('stop')}ワークアウト終了して記録
      </button>
      <button class="md-button md-button--text md-button--danger md-button--block md-state" id="abortBtn">
        記録せずに中止
      </button>
    </div>
  `;
}

/** 再描画してイベントを貼り直す（休憩タイマーの状態変化などで呼ぶ） */
function paintAndRebind(root) {
  root.removeEventListener('click', onClick);
  root.removeEventListener('input', onInput);
  paint(root);
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  startElapsed();
  startTicking(() => paintAndRebind(root));
  watchRestStick();
}

function entryCard(e, ei) {
  const carried = e.suggestion?.status === 'carry_over';
  return `
    <div class="md-card md-card--elevated" data-entry="${ei}">
      <div class="md-card__header">
        <div class="ll-grow">
          <div class="md-card__title">${esc(e.menu)}</div>
          <div class="md-card__subhead">
            ${esc(e.part)}${carried ? ` · 前回 ${fmtNum(e.suggestion.baseWeight)}kg → 今回 ${fmtNum(e.weight)}kg` : ` · ${fmtNum(e.weight)}kg`}
          </div>
        </div>
        <button class="md-icon-button md-state" data-act="guide" aria-label="解説">${icon('info')}</button>
      </div>

      <div class="ll-entry-tools">
        <button class="md-icon-button md-state" data-act="moveup" aria-label="${esc(e.menu)}を上へ"
                ${ei === 0 ? 'disabled' : ''}>${icon('up', 'icon--sm')}</button>
        <button class="md-icon-button md-state" data-act="movedown" aria-label="${esc(e.menu)}を下へ"
                ${ei === state.draft.entries.length - 1 ? 'disabled' : ''}>${icon('down', 'icon--sm')}</button>
        <span class="ll-grow"></span>
        <button class="md-button md-button--text md-button--compact md-state ll-danger"
                data-act="delentry">${icon('delete', 'icon--sm')}種目を削除</button>
      </div>

      ${plateStrip(e.weight, e.config?.equipment)}

      <div class="ll-set-head">
        <span>#</span><span>重量 kg</span><span>レップ</span>
        <span title="RPE = 10 − 余力レップ数。8 なら、あと2回は挙げられた状態">RPE</span><span></span>
      </div>
      ${e.sets.map((s, si) => setRow(s, si)).join('')}

      <div class="ll-row" style="margin-top:12px">
        <button class="md-button md-button--tonal md-button--compact md-state ll-grow" data-act="addset">${icon('add')}セット追加</button>
        <button class="md-button md-button--outlined md-button--compact md-state ll-grow" data-act="addwarm">${icon('add')}ウォームアップ</button>
      </div>
    </div>`;
}

function setRow(s, si) {
  const max = isMaxSet(s);
  return `
    <div class="ll-set-row ${s.isWarmup ? 'll-set-row--warmup' : ''} ${max ? 'll-set-row--max' : ''}" data-set="${si}">
      <div class="ll-set-row__no">${s.isWarmup ? 'W' : max ? 'M' : s.setNo}</div>
      <div class="md-field md-field--compact" style="margin:0">
        <input class="md-field__input" type="number" inputmode="decimal" step="0.25" data-f="weight"
               value="${s.weight ?? ''}" aria-label="重量">
      </div>
      ${max ? `
        <div class="md-field md-field--compact" style="margin:0">
          <select class="md-field__input" data-f="reps" aria-label="結果">
            <option value="" ${!s.reps ? 'selected' : ''}>—</option>
            <option value="1" ${Number(s.reps) === 1 ? 'selected' : ''}>成功</option>
            <option value="0" ${String(s.reps) === '0' ? 'selected' : ''}>失敗</option>
          </select>
        </div>` : `
        <div class="md-field md-field--compact" style="margin:0">
          <input class="md-field__input" type="number" inputmode="numeric" data-f="reps"
                 value="${s.reps ?? ''}" placeholder="—" aria-label="レップ">
        </div>`}
      <div class="md-field md-field--compact" style="margin:0">
        <select class="md-field__input" data-f="rpe" aria-label="RPE">
          ${RPE_OPTIONS.map((o) =>
            `<option value="${o.value}" ${String(s.rpe ?? '') === o.value ? 'selected' : ''}>${o.label}${o.note ? '　' + o.note : ''}</option>`).join('')}
        </select>
      </div>
      <button class="md-icon-button md-state" data-act="delset" aria-label="このセットを削除"
              style="width:40px;height:40px">${icon('close', 'icon--sm')}</button>
    </div>
    ${rpeChip(s.rpe)}
    <button class="ll-insert" data-act="insertset" data-after="${si}"
            aria-label="${si + 1}番目の後にセットを挿入">
      <span>＋ ここにセットを挿入</span>
    </button>`;
}

/** 種目ごと消す。入力済みのセットがあるときは確認する */
async function removeEntry(root, entry) {
  const filled = entry.sets.filter((s) => Number(s.reps) > 0).length;
  if (filled) {
    const ok = await confirmDialog({
      headline: `「${entry.menu}」を削除しますか？`,
      body: `入力済みの ${filled} セットも一緒に消えます。まだ保存していないので、元に戻せません。`,
      confirmLabel: '削除する',
      danger: true
    });
    if (!ok) return;
  }
  const i = state.draft.entries.indexOf(entry);
  if (i >= 0) state.draft.entries.splice(i, 1);
  if (!state.draft.entries.length) {
    snackbar('種目がなくなりました。追加するか、記録せずに中止してください', 'err');
  }
  saveDraft();
  touch();
  paintAndRebind(root);
}

function calcTotals(draft) {
  let volume = 0, sets = 0;
  draft.entries.forEach((e) => e.sets.forEach((s) => {
    const w = Number(s.weight) || 0, r = Number(s.reps) || 0;
    if (!r || s.isWarmup) return;
    volume += w * r; sets++;
  }));
  return { volume, sets };
}

function locate(el) {
  const card = el.closest('[data-entry]');
  const row = el.closest('[data-set]');
  const entry = card ? state.draft.entries[Number(card.dataset.entry)] : null;
  const set = (entry && row) ? entry.sets[Number(row.dataset.set)] : null;
  return { entry, set, setIndex: row ? Number(row.dataset.set) : -1 };
}

function onInput(ev) {
  const el = ev.target;
  if (el.dataset.act === 'memo') {
    state.draft.memo = el.value;
    saveDraft();
    touch();
    return;
  }
  if (!el.dataset.f) return;
  const { set } = locate(el);
  if (!set) return;

  if (el.dataset.f === 'rpe') {
    // MAX は数値ではないので、文字のまま持つ。
    // MAX に入る／出るときは、レップの入力が「回数」と「成否」で入れ替わるので描き直す
    const was = isMaxSet(set);
    set.rpe = el.value;
    const now = isMaxSet(set);
    if (was !== now) {
      set.reps = '';
      if (now) set.isWarmup = false;
      saveDraft();
      touch();
      return paintAndRebind(ev.currentTarget);
    }
  } else {
    set[el.dataset.f] = el.value === '' ? '' : Number(el.value);
  }
  saveDraft();
  touch();
  const totals = calcTotals(state.draft);
  const volEl = ev.currentTarget.querySelector('#totVolume');
  const setEl = ev.currentTarget.querySelector('#totSets');
  if (volEl) volEl.textContent = fmtVolume(totals.volume);
  if (setEl) setEl.textContent = `${totals.sets} セット完了`;
}

function onClick(ev) {
  const root = ev.currentTarget;
  if (handleRestClick(ev.target)) return paintAndRebind(root);
  if (ev.target.closest('#finishBtn')) return finish(root);
  if (ev.target.closest('#abortBtn')) return abort();
  if (ev.target.closest('#addExerciseBtn')) return addExercise(root);

  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const { entry, setIndex } = locate(btn);
  const act = btn.dataset.act;

  if (act === 'guide' && entry) return showGuide(entry.part, entry.menu);
  if (!entry) return;

  if (act === 'addset' || act === 'addwarm') {
    const isWarm = act === 'addwarm';
    const workSets = entry.sets.filter((s) => !s.isWarmup);
    const lastWork = workSets[workSets.length - 1];
    entry.sets.push({
      setNo: isWarm ? 0 : workSets.length + 1,
      weight: isWarm ? Math.round(((entry.weight || 0) * 0.5) / 2.5) * 2.5 : (lastWork?.weight ?? entry.weight),
      reps: isWarm ? '' : (lastWork?.reps ?? ''),
      rpe: '', isWarmup: isWarm
    });
  } else if (act === 'insertset') {
    // ボタンはセット行の外にあるので、行からではなくボタン自身から位置を取る
    const after = Number(btn.dataset.after);
    if (!Number.isInteger(after) || !entry.sets[after]) return;
    // 直前のセットを複製して、その下に差し込む。重量とレップは引き継ぐ
    const base = entry.sets[after];
    entry.sets.splice(after + 1, 0, {
      setNo: 0, weight: base.weight, reps: base.reps, rpe: '',
      isWarmup: base.isWarmup, isMax: false
    });
    renumber(entry);
  } else if (act === 'delset' && setIndex >= 0) {
    entry.sets.splice(setIndex, 1);
    renumber(entry);
  } else if (act === 'moveup' || act === 'movedown') {
    const i = state.draft.entries.indexOf(entry);
    const j = act === 'moveup' ? i - 1 : i + 1;
    if (j < 0 || j >= state.draft.entries.length) return;
    state.draft.entries.splice(j, 0, state.draft.entries.splice(i, 1)[0]);
  } else if (act === 'delentry') {
    return removeEntry(root, entry);
  } else {
    return;
  }
  saveDraft();
  touch();
  paintAndRebind(root);
}

/**
 * ワークアウト中に種目を足す。
 * 履歴があれば通常の開始時と同じく、前回のセット数・レップを引き継いで重量だけ上げた状態で入る。
 */
function addExercise(root) {
  openExercisePicker({
    exclude: state.draft.entries.map((e) => ({ part: e.part, menu: e.menu })),
    onPick: async (picked) => {
      try {
        const increment = Number(state.profile?.weight_increment) || 2.5;
        const { suggestion } = await db.suggestion(state.profile.id, picked, increment);
        state.draft.entries.push({
          part: picked.part,
          menu: picked.menu,
          suggestion,
          config: picked,
          weight: suggestion.finalWeight ?? null,
          increment: suggestion.increment ?? increment,
          plan: (suggestion.plan || []).map((p) => ({ ...p })),
          sets: (suggestion.plan || []).map((p, i) => ({
            setNo: i + 1,
            weight: p.weight ?? null,
            reps: p.reps === '' || p.reps == null ? '' : p.reps,
            rpe: '',
            isWarmup: false
          }))
        });
        saveDraft();
        touch();
        paintAndRebind(root);
        snackbar(suggestion.status === 'carry_over'
          ? `${picked.menu} を追加しました（前回 ${fmtNum(suggestion.baseWeight)}kg → ${fmtNum(suggestion.finalWeight)}kg）`
          : `${picked.menu} を追加しました（履歴が無いので重量を入力してください）`, 'ok');
        // 追加した種目までスクロールする
        requestAnimationFrame(() => {
          const cards = root.querySelectorAll('[data-entry]');
          cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } catch (err) {
        snackbar(err.message, 'err');
      }
    }
  });
}

function renumber(entry) {
  let n = 1;
  entry.sets.forEach((s) => { if (!s.isWarmup) s.setNo = n++; });
}

async function finish(root) {
  const draft = state.draft;
  const workout = state.workout;            // state.workout は保存後に null にするので控える
  const memo = draft.memo || '';
  const startedAt = draft.startTime;
  const entries = draft.entries.map((e) => ({
    part: e.part,
    menu: e.menu,
    equipment: e.config?.equipment || '',
    sets: e.sets
      // MAX の失敗は 0 レップ。記録として残したいので落とさない
      .filter((s) => (isMaxSet(s) ? s.reps !== '' && s.reps !== null : Number(s.reps) > 0))
      .map((s) => ({
        setNo: s.setNo, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0,
        rpe: isMaxSet(s) ? 10 : (s.rpe === '' ? '' : Number(s.rpe)),
        isWarmup: !!s.isWarmup,
        isMax: isMaxSet(s)
      }))
  })).filter((e) => e.sets.length);

  if (!entries.length) {
    snackbar('レップ数が入力されたセットがありません', 'err');
    return;
  }
  const ok = await confirmDialog({
    headline: 'ワークアウトを終了しますか？',
    body: '入力済みのセットを記録として保存します。',
    confirmLabel: '記録する'
  });
  if (!ok) return;
  await flushNow();

  try {
    const res = await db.finishWorkout(workout, entries, {
      memo,
      restMinutes: draft.rest?.minutes,
      startedAt,
      bodyWeight: state.profile?.body_weight
    });
    teardown();
    clearDraft();
    resetPicking();
    state.workout = null;
    state.dashboard = await db.dashboard(state.profile.id);
    snackbar(`${res.savedSets}セット / ${fmtVolume(res.totalVolume)} を記録しました`, 'ok');
    navigate('/dashboard');

    // カレンダーへの書き込みは記録の保存とは切り離す。
    // ここで失敗しても記録はすでに Supabase に入っている。
    addToCalendar(workout, entries, { memo, startedAt });
  } catch (err) {
    snackbar(err.message, 'err');
  }
}

/**
 * ワークアウトをカレンダーに追加する。
 * 記録の保存はすでに終わっているので、ここでの失敗は知らせるだけにとどめる。
 */
async function addToCalendar(workout, entries, { memo, startedAt }) {
  const calendarId = state.profile?.calendar_id;
  if (!workout || !calendarId || !gcal.isGoogleConfigured()) return;
  try {
    const eventId = await gcal.createEvent({
      calendarId,
      workout: { memo },
      entries,
      startedAt: startedAt || workout.started_at,
      endedAt: new Date().toISOString()
    });
    await db.setCalendarEvent(workout.id, eventId);
    snackbar('Googleカレンダーに追加しました', 'ok');
  } catch (err) {
    snackbar('記録は保存できましたが、カレンダーへの追加に失敗しました。' + err.message, 'err');
  }
}

async function abort() {
  const ok = await confirmDialog({
    headline: 'ワークアウトを中止しますか？',
    body: '入力した内容は破棄され、記録されません。',
    confirmLabel: '破棄する',
    danger: true
  });
  if (!ok) return;
  const workout = state.workout;
  teardown();
  clearDraft();
  resetPicking();
  state.workout = null;
  if (workout) {
    if (workout.calendar_event_id && state.profile?.calendar_id) {
      try {
        await gcal.deleteEvent({
          calendarId: state.profile.calendar_id, eventId: workout.calendar_event_id
        });
      } catch { /* 予定が残っても記録の中止は進める */ }
    }
    try { await db.deleteWorkout(workout.id); } catch { /* 既に無ければ無視 */ }
  }
  snackbar('ワークアウトを中止しました');
  navigate('/home');
}
