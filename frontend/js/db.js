/**
 * db.js — Supabase へのデータアクセス
 *
 * 閲覧はログイン不要（覗き見）。書き込みは RLS により本人のみ。
 * UIを迂回して直接呼んでも、他人のデータは書き換えられない。
 */
import { sb, throwIf } from './supabase.js';
import { suggestNextLoad, epley1RM } from './progression.js';

const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const today = () => ymd(new Date());
const monthStart = (m) => `${m}-01`;
const monthEnd = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return ymd(new Date(y, mo, 0));
};
export const thisMonth = () => today().slice(0, 7);

/* ---------- 種目と解説 ---------- */

export async function loadExercises() {
  const { data, error } = await sb()
    .from('exercises')
    .select('id, part, name, equipment, rep_min, rep_max, default_sets, sort_order, part_order, created_by,'
          + ' exercise_guides ( description, muscles, assist_muscles, points, cautions, videos, tags )')
    .eq('active', true)
    .order('part_order').order('sort_order');
  throwIf(error, '種目の読み込み');

  return (data || []).map((e) => ({
    id: e.id,
    part: e.part,
    menu: e.name,
    equipment: e.equipment || '',
    repMin: e.rep_min,
    repMax: e.rep_max,
    defaultSets: e.default_sets,
    createdBy: e.created_by || null,
    guide: e.exercise_guides ? {
      part: e.part,
      menu: e.name,
      key: `${e.part}::${e.name}`,
      description: e.exercise_guides.description || '',
      muscles: e.exercise_guides.muscles || [],
      assistMuscles: e.exercise_guides.assist_muscles || [],
      points: e.exercise_guides.points || [],
      cautions: e.exercise_guides.cautions || [],
      videos: e.exercise_guides.videos || [],
      tags: e.exercise_guides.tags || []
    } : null
  }));
}

/**
 * 種目を1件追加する。部位は既存のものでも新しい名前でもよい。
 * 器具・目標レップ・セット数は既定値で始め、必要なら Supabase の表画面で直す。
 */
export async function createExercise({ part, name, userId }) {
  const p = String(part || '').trim();
  const n = String(name || '').trim().replace(/\s+/g, ' ');
  if (!p) throw new Error('部位を選ぶか入力してください。');
  if (!n) throw new Error('種目名を入力してください。');
  if (n.length > 40) throw new Error('種目名は40文字以内にしてください。');

  const client = sb();

  // 同じ部位・種目名が「隠されている」状態で残っていたら、作り直さず戻す
  const { data: existing } = await client.from('exercises')
    .select('id, active').eq('part', p).eq('name', n).maybeSingle();
  if (existing) {
    if (existing.active) throw new Error(`「${p} / ${n}」はすでに登録されています。`);
    const { error } = await client.from('exercises').update({ active: true }).eq('id', existing.id);
    throwIf(error, '種目の復帰');
    return { id: existing.id, part: p, name: n, restored: true };
  }

  // 同じ部位の末尾に並ぶようにする
  const { data: siblings } = await client.from('exercises')
    .select('sort_order, part_order').eq('part', p).order('sort_order', { ascending: false }).limit(1);
  const { data: parts } = await client.from('exercises')
    .select('part_order').order('part_order', { ascending: false }).limit(1);

  const { data, error } = await client.from('exercises').insert({
    part: p,
    name: n,
    sort_order: (siblings?.[0]?.sort_order ?? 0) + 1,
    part_order: siblings?.[0]?.part_order ?? ((parts?.[0]?.part_order ?? 0) + 1),
    active: true,
    created_by: userId
  }).select().single();
  if (error?.code === '23505') throw new Error(`「${p} / ${n}」はすでに登録されています。`);
  throwIf(error, '種目の追加');
  return { id: data.id, part: data.part, name: data.name, restored: false };
}

/** 一覧から隠す。過去の記録は workout_sets に残るので消えない。 */
export async function hideExercise(id) {
  const { error } = await sb().from('exercises').update({ active: false }).eq('id', id);
  throwIf(error, '種目を隠す');
}

/* ---------- プロフィール ---------- */

export async function getProfile(userId) {
  const { data, error } = await sb().from('profiles').select('*').eq('id', userId).maybeSingle();
  throwIf(error, 'プロフィールの読み込み');
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await sb().from('profiles').update(patch).eq('id', userId).select().single();
  throwIf(error, '設定の保存');
  return data;
}

/* ---------- 履歴と重量提案 ---------- */

/** 指定種目の直近セッションを新しい順に返す */
export async function exerciseHistory(userId, part, exercise, limitSessions = 6) {
  const { data, error } = await sb()
    .from('workout_sets')
    .select('date, set_no, weight, reps, rpe, is_warmup, workout_id')
    .eq('user_id', userId).eq('part', part).eq('exercise', exercise)
    .order('date', { ascending: false }).order('set_no')
    .limit(limitSessions * 12);
  throwIf(error, '履歴の読み込み');

  const byDate = new Map();
  (data || []).forEach((r) => {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push({
      setNo: r.set_no, weight: Number(r.weight), reps: r.reps,
      rpe: r.rpe == null ? null : Number(r.rpe), isWarmup: r.is_warmup
    });
  });
  return [...byDate.entries()]
    .slice(0, limitSessions)
    .map(([date, sets]) => ({
      date,
      sets: sets.sort((a, b) => a.setNo - b.setNo),
      workSets: sets.filter((s) => !s.isWarmup)
    }));
}

export async function suggestion(userId, exercise, increment) {
  const history = await exerciseHistory(userId, exercise.part, exercise.menu, 6);
  return {
    suggestion: suggestNextLoad(history, {
      part: exercise.part, name: exercise.menu,
      repMin: exercise.repMin, repMax: exercise.repMax, defaultSets: exercise.defaultSets
    }, increment),
    history
  };
}

/* ---------- ワークアウト ---------- */

/** 実施中のワークアウト（端末をまたいで再開するために使う） */
export async function activeWorkout(userId) {
  const { data, error } = await sb()
    .from('workouts').select('*')
    .eq('user_id', userId).eq('status', 'active')
    .order('started_at', { ascending: false }).limit(1).maybeSingle();
  throwIf(error, '実施中ワークアウトの確認');
  return data;
}

export async function startWorkout(userId, { date, restMinutes, draft } = {}) {
  // started_at は DB の既定値に任せず明示的に送る。
  // 返り値に入っていなかったときに経過時間が NaN になるのを防ぐため。
  const { data, error } = await sb().from('workouts')
    .insert({
      user_id: userId, date: date || today(), status: 'active',
      started_at: new Date().toISOString(),
      rest_minutes: restMinutes ?? null, draft: draft ?? null
    })
    .select().single();
  throwIf(error, 'ワークアウトの開始');
  return data;
}

/** 入力途中の内容を丸ごと保存する（自動保存の実体） */
export async function saveDraft(workoutId, draft, extra = {}) {
  const { error } = await sb().from('workouts')
    .update({ draft, ...extra }).eq('id', workoutId);
  throwIf(error, '自動保存');
}

/**
 * ワークアウトを終了して、セットを書き込む。
 * 途中で失敗しても二重登録にならないよう、既存のセットを消してから入れ直す。
 */
/** その種目が自重か。自重なら体重ぶんをボリュームに足す */
const usesBodyWeight = (equipment) => /自重/.test(String(equipment || ''));

export async function finishWorkout(workout, entries, { memo, restMinutes, startedAt, bodyWeight } = {}) {
  const client = sb();
  const rows = [];
  const parts = new Set();
  let totalVolume = 0, totalSets = 0;

  const bw = Number(bodyWeight) > 0 ? Number(bodyWeight) : null;

  entries.forEach((entry) => {
    parts.add(entry.part);
    // 自重種目のときだけ、そのときの体重を一緒に残す。
    // 後から体重が変わっても、過去の記録は動かない。
    const bwUsed = usesBodyWeight(entry.equipment) ? bw : null;
    entry.sets.forEach((s, i) => {
      const reps = Number(s.reps) || 0;
      const isMax = Boolean(s.isMax);
      // MAX の失敗（0レップ）だけは、記録として残す
      if (!reps && !isMax) return;
      const weight = Number(s.weight) || 0;
      const effective = weight + (bwUsed || 0);
      if (!s.isWarmup && reps) { totalVolume += effective * reps; totalSets += 1; }
      rows.push({
        workout_id: workout.id, user_id: workout.user_id, date: workout.date,
        part: entry.part, exercise: entry.menu,
        set_no: Number(s.setNo) || i + 1,
        weight, reps,
        rpe: s.rpe === '' || s.rpe == null ? null : Number(s.rpe),
        is_warmup: Boolean(s.isWarmup),
        is_max: isMax,
        body_weight_used: bwUsed,
        memo: s.memo || null
      });
    });
  });
  if (!rows.length) throw new Error('レップ数が入力されたセットがありません。');

  const { error: delError } = await client.from('workout_sets').delete().eq('workout_id', workout.id);
  throwIf(delError, '記録の保存');

  const { error: insError } = await client.from('workout_sets').insert(rows);
  throwIf(insError, '記録の保存');

  const ended = new Date();
  const started = new Date(startedAt || workout.started_at);
  const { error: upError } = await client.from('workouts').update({
    status: 'finished',
    ended_at: ended.toISOString(),
    duration_min: Math.max(0, Math.round((ended - started) / 60000)),
    total_sets: totalSets,
    total_volume: Math.round(totalVolume * 10) / 10,
    rest_minutes: restMinutes ?? workout.rest_minutes,
    memo: memo || null,
    draft: null
  }).eq('id', workout.id);
  throwIf(upError, 'ワークアウトの終了');

  return { savedSets: rows.length, totalVolume: Math.round(totalVolume * 10) / 10, totalSets };
}

/** 作成した Google カレンダーの予定IDを覚えておく */
export async function setCalendarEvent(workoutId, eventId) {
  const { error } = await sb().from('workouts')
    .update({ calendar_event_id: eventId }).eq('id', workoutId);
  throwIf(error, 'カレンダー連携の保存');
}

export async function deleteWorkout(workoutId) {
  const { error } = await sb().from('workouts').delete().eq('id', workoutId);
  throwIf(error, 'ワークアウトの削除');
}

/**
 * ある日のワークアウトの中身を取り出す。
 * セットは保存した順（id順）に並ぶので、同じ種目の連続をまとめればその日の流れになる。
 */
export async function workoutDetail(userId, date) {
  const client = sb();
  const [wRes, sRes] = await Promise.all([
    client.from('workouts')
      .select('id, date, started_at, ended_at, duration_min, total_sets, total_volume, memo, rest_minutes, calendar_event_id')
      .eq('user_id', userId).eq('date', date).eq('status', 'finished')
      .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('workout_sets')
      .select('id, part, exercise, set_no, weight, reps, rpe, is_warmup, volume, est_1rm')
      .eq('user_id', userId).eq('date', date).order('id')
  ]);
  throwIf(wRes.error, 'ワークアウトの読み込み');
  throwIf(sRes.error, 'セットの読み込み');

  const entries = [];
  (sRes.data || []).forEach((row) => {
    const last = entries[entries.length - 1];
    if (!last || last.part !== row.part || last.menu !== row.exercise) {
      entries.push({ part: row.part, menu: row.exercise, sets: [] });
    }
    entries[entries.length - 1].sets.push({
      setNo: row.set_no,
      weight: Number(row.weight),
      reps: row.reps,
      rpe: row.rpe == null ? null : Number(row.rpe),
      isWarmup: row.is_warmup,
      volume: Number(row.volume || 0),
      est1RM: row.est_1rm == null ? null : Number(row.est_1rm)
    });
  });

  const work = (sRes.data || []).filter((r) => !r.is_warmup);
  return {
    date,
    workout: wRes.data || null,
    entries,
    totals: {
      sets: work.length,
      volume: round1(work.reduce((a, r) => a + Number(r.volume || 0), 0)),
      reps: work.reduce((a, r) => a + r.reps, 0)
    }
  };
}

/* ---------- 記録の閲覧許可（申請と承認） ---------- */

/**
 * 自分に関わる閲覧許可をまとめて取る。
 *   incoming … 自分の記録を見たい、と言ってきた人
 *   outgoing … 自分が見たい、と申請した相手
 * 名前は profiles から引く（一覧はログイン画面と同じく公開）。
 */
export async function accessList(userId) {
  const client = sb();
  const [rowsRes, profRes] = await Promise.all([
    client.from('viewer_access')
      .select('owner_id, viewer_id, status, requested_at, decided_at')
      .or(`owner_id.eq.${userId},viewer_id.eq.${userId}`),
    client.from('profiles').select('id, display_name')
  ]);
  throwIf(rowsRes.error, '閲覧許可の読み込み');
  throwIf(profRes.error, '名前の読み込み');

  const name = new Map((profRes.data || []).map((p) => [p.id, p.display_name]));
  const rows = rowsRes.data || [];
  const shape = (r, otherId) => ({
    ownerId: r.owner_id, viewerId: r.viewer_id, status: r.status,
    otherId, name: name.get(otherId) || '（不明）',
    requestedAt: r.requested_at, decidedAt: r.decided_at
  });

  return {
    incoming: rows.filter((r) => r.owner_id === userId).map((r) => shape(r, r.viewer_id)),
    outgoing: rows.filter((r) => r.viewer_id === userId).map((r) => shape(r, r.owner_id)),
    // まだ関わりの無い人。ここから申請を送る
    others: (profRes.data || []).filter((p) => p.id !== userId
      && !rows.some((r) => r.owner_id === p.id && r.viewer_id === userId))
      .map((p) => ({ id: p.id, name: p.display_name }))
  };
}

/** 見せてほしい、と申請する */
export async function requestAccess(viewerId, ownerId) {
  const { error } = await sb().from('viewer_access')
    .insert({ owner_id: ownerId, viewer_id: viewerId, status: 'pending' });
  throwIf(error, '閲覧の申請');
}

/** 申請を承認する。できるのは見られる本人だけ（RLSでも縛っている） */
export async function approveAccess(ownerId, viewerId) {
  const { error } = await sb().from('viewer_access')
    .update({ status: 'approved', decided_at: new Date().toISOString() })
    .eq('owner_id', ownerId).eq('viewer_id', viewerId);
  throwIf(error, '閲覧の承認');
}

/** 申請の取り下げ、拒否、許可の取り消し。どれも同じ「行を消す」 */
export async function removeAccess(ownerId, viewerId) {
  const { error } = await sb().from('viewer_access')
    .delete().eq('owner_id', ownerId).eq('viewer_id', viewerId);
  throwIf(error, '閲覧許可の取り消し');
}

/* ---------- 月間レポート ---------- */

export async function dashboard(userId, month) {
  const m = month || thisMonth();
  const from = monthStart(m), to = monthEnd(m);
  const client = sb();

  const sixAgo = (() => {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 6, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  // 回復の計算に使う直近14日ぶん（月をまたいでも途切れないように）
  const recentFrom = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return ymd(d);
  })();

  const [setsRes, workoutsRes, dailyRes, bestRes, profileRes, recentRes, maxRes] = await Promise.all([
    client.from('workout_sets')
      .select('date, part, exercise, weight, reps, est_1rm, volume')
      .eq('user_id', userId).eq('is_warmup', false).gte('date', from).lte('date', to),
    client.from('workouts')
      .select('id, date, duration_min, total_volume, total_sets, memo, calendar_event_id')
      .eq('user_id', userId).eq('status', 'finished').gte('date', sixAgo).lte('date', to)
      .order('date', { ascending: false }),
    client.from('v_daily_volume')
      .select('date, volume, sets, parts')
      .eq('user_id', userId).gte('date', sixAgo).lte('date', to),
    client.from('v_exercise_monthly_best')
      .select('part, exercise, month, best_est_1rm, best_weight')
      .eq('user_id', userId),
    client.from('profiles')
      .select('monthly_target_workouts, monthly_target_volume, body_weight').eq('id', userId).maybeSingle(),
    client.from('workout_sets')
      .select('date, part, exercise')
      .eq('user_id', userId).gte('date', recentFrom),
    client.from('workout_sets')
      .select('date, part, exercise, weight, reps, est_1rm, is_max, body_weight_used')
      .eq('user_id', userId).eq('is_warmup', false)
  ]);
  [setsRes, workoutsRes, dailyRes, bestRes, profileRes, recentRes, maxRes]
    .forEach((r) => throwIf(r.error, '月間レポートの集計'));

  const sets = setsRes.data || [];
  const allWorkouts = workoutsRes.data || [];
  const monthWorkouts = allWorkouts.filter((w) => w.date >= from && w.date <= to);
  const daily = dailyRes.data || [];
  const target = profileRes.data?.monthly_target_workouts ?? 12;
  const targetVolume = Number(profileRes.data?.monthly_target_volume ?? 0);

  const totalVolume = round1(sets.reduce((a, s) => a + Number(s.volume || 0), 0));
  const totalReps = sets.reduce((a, s) => a + (s.reps || 0), 0);
  const totalMinutes = monthWorkouts.reduce((a, w) => a + (w.duration_min || 0), 0);
  const done = monthWorkouts.length;

  /* 経過日数から「今日時点の目安」を出す */
  const [y, mo] = m.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const t = today();
  const isCurrent = t.slice(0, 7) === m;
  const elapsed = isCurrent ? Number(t.slice(8, 10)) : daysInMonth;
  const expected = Math.round(target * (elapsed / daysInMonth) * 10) / 10;

  /* 部位別 */
  const partMap = new Map();
  sets.forEach((s) => {
    const p = partMap.get(s.part) || { part: s.part, sets: 0, volume: 0, dates: new Set() };
    p.sets++; p.volume += Number(s.volume || 0); p.dates.add(s.date);
    partMap.set(s.part, p);
  });
  const byPart = [...partMap.values()].map((p) => ({
    part: p.part, sets: p.sets, volume: round1(p.volume), sessions: p.dates.size,
    ratio: totalVolume > 0 ? Math.round((p.volume / totalVolume) * 1000) / 10 : 0
  })).sort((a, b) => b.volume - a.volume);

  /* カレンダー */
  const dayMap = new Map(daily.filter((d) => d.date >= from && d.date <= to).map((d) => [d.date, d]));
  const calendar = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${m}-${String(d).padStart(2, '0')}`;
    const hit = dayMap.get(ds);
    calendar.push({
      date: ds, day: d, dow: new Date(y, mo - 1, d).getDay(),
      volume: hit ? round1(Number(hit.volume)) : 0,
      sets: hit ? hit.sets : 0,
      parts: hit ? (hit.parts || []) : [],
      isFuture: isCurrent && d > elapsed
    });
  }

  /* 自己ベスト更新: 今月のベスト > 今月より前のベスト */
  const best = bestRes.data || [];
  const prevBest = new Map();
  const curBest = new Map();
  best.forEach((b) => {
    const key = `${b.part}::${b.exercise}`;
    if (b.month < from) {
      prevBest.set(key, Math.max(prevBest.get(key) || 0, Number(b.best_est_1rm || 0)));
    } else if (b.month === from) {
      curBest.set(key, Number(b.best_est_1rm || 0));
    }
  });
  const prs = [];
  curBest.forEach((v, key) => {
    const before = prevBest.get(key) || 0;
    if (v <= before) return;
    const [part, exercise] = key.split('::');
    const hit = sets.filter((s) => s.part === part && s.exercise === exercise)
      .sort((a, b) => Number(b.est_1rm) - Number(a.est_1rm))[0];
    prs.push({
      part, menu: exercise, est1RM: round1(v), previous: round1(before), gain: round1(v - before),
      weight: hit ? Number(hit.weight) : 0, reps: hit ? hit.reps : 0, date: hit ? hit.date : ''
    });
  });
  prs.sort((a, b) => b.gain - a.gain);

  const topLifts = [...curBest.entries()]
    .map(([key, v]) => {
      const [part, exercise] = key.split('::');
      return { part, menu: exercise, est1RM: round1(v) };
    })
    .sort((a, b) => b.est1RM - a.est1RM).slice(0, 5);

  /* 直近6ヶ月 */
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, mo - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    trend.push({
      month: key,
      workouts: allWorkouts.filter((w) => w.date.slice(0, 7) === key).length,
      volume: round1(daily.filter((x) => x.date.slice(0, 7) === key)
        .reduce((a, x) => a + Number(x.volume || 0), 0))
    });
  }

  // 最近のワークアウト（削除の導線に使う）。部位はその日のセットから拾う
  const partsByDate = new Map();
  sets.forEach((s2) => {
    const set = partsByDate.get(s2.date) || new Set();
    set.add(s2.part);
    partsByDate.set(s2.date, set);
  });
  const recentWorkouts = monthWorkouts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((w) => ({
      id: w.id, date: w.date,
      durationMin: w.duration_min || 0,
      volume: round1(Number(w.total_volume || 0)),
      sets: w.total_sets || 0,
      memo: w.memo || '',
      calendarEventId: w.calendar_event_id || null,
      parts: [...(partsByDate.get(w.date) || [])]
    }));

  const lastDate = daily.map((d) => d.date).sort().pop() || null;

  /* 直近のワークアウトで一番重かったセット。ホームの「次に持つ重さ」の土台 */
  const lastMain = (() => {
    if (!lastDate) return null;
    const sameDay = sets.filter((s2) => s2.date === lastDate);
    if (!sameDay.length) return null;
    const top = sameDay.slice().sort((a, b) => Number(b.weight) - Number(a.weight))[0];
    const sameLift = sameDay.filter((s2) => s2.exercise === top.exercise)
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      part: top.part, menu: top.exercise, date: lastDate,
      weight: Number(top.weight),
      reps: sameLift.map((s2) => s2.reps)
    };
  })();


  return {
    month: m,
    monthLabel: `${y}年${mo}月`,
    goal: {
      targetWorkouts: target, doneWorkouts: done,
      achievementRate: target > 0 ? Math.round((done / target) * 1000) / 10 : 0,
      remaining: Math.max(0, target - done),
      expectedByToday: expected,
      pace: expected > 0 ? Math.round((done / expected) * 1000) / 10 : 0,
      onTrack: done >= expected,
      elapsedDays: elapsed, daysInMonth,
      targetVolume,
      volumeRate: targetVolume > 0 ? Math.round((totalVolume / targetVolume) * 1000) / 10 : null
    },
    totals: {
      volume: totalVolume, sets: sets.length, reps: totalReps, minutes: totalMinutes,
      avgVolumePerSession: done > 0 ? round1(totalVolume / done) : 0,
      avgMinutesPerSession: done > 0 ? Math.round(totalMinutes / done) : 0,
      // 週あたりの平均日数。経過したぶんの週数で割る（月末まで待たない）
      avgDaysPerWeek: (() => {
        const weeks = Math.max(1, elapsed / 7);
        return Math.round((done / weeks) * 10) / 10;
      })()
    },
    byPart, calendar, prs, topLifts, trend, recentWorkouts, lastMain,
    big3: big3Of(maxRes.data || []),
    recentSets: recentRes.data || [],
    bodyWeight: profileRes.data?.body_weight ?? null,
    lastWorkoutDate: lastDate,
    restDays: lastDate ? Math.floor((dateOf(t) - dateOf(lastDate)) / 86400000) : null
  };
}

/** パワーリフティングの3種目。名前が違うジムもあるので、含まれていれば拾う */
const BIG3 = [
  { key: 'bench',    label: 'ベンチプレス', match: /^ベンチプレス$/ },
  { key: 'squat',    label: 'スクワット',   match: /^(バーベル)?スクワット$/ },
  { key: 'deadlift', label: 'デッドリフト', match: /^デッドリフト$/ }
];

/**
 * BIG3 の「実測MAX」と「理論上のMAX」を出す。
 *  実測   … MAXとして挙げて成功した重量の最大
 *  理論値 … 通常セットの記録から Epley 式で推定した 1RM の最大
 * 理論値のほうが 5kg 以上高ければ挑戦の余地、低ければ普段の強度が足りていない。
 */
function big3Of(allSets) {
  return BIG3.map(({ key, label, match }) => {
    const mine = allSets.filter((s) => match.test(String(s.exercise)));
    const eff = (s) => Number(s.weight) + Number(s.body_weight_used || 0);

    const tested = mine.filter((s) => s.is_max && Number(s.reps) > 0)
      .reduce((a, s) => (eff(s) > (a?.w ?? 0) ? { w: eff(s), date: s.date } : a), null);
    const est = mine.filter((s) => !s.is_max && Number(s.est_1rm) > 0)
      .reduce((a, s) => (Number(s.est_1rm) > (a?.w ?? 0)
        ? { w: Number(s.est_1rm), date: s.date, from: `${fmtKg(eff(s))}kg × ${s.reps}` } : a), null);

    let advice = null;
    if (est && tested) {
      const gap = round1(est.w - tested.w);
      if (gap >= 5) advice = { tone: 'try', text: `理論値が +${gap}kg。MAXに挑戦できます` };
      else if (gap < 0) advice = { tone: 'push', text: '普段の強度が足りていません。重量かレップを上げましょう' };
      else advice = null;   // かみ合っているときは、わざわざ言わない
    } else if (est && !tested) {
      advice = { tone: 'try', text: `記録上は ${fmtKg(est.w)}kg。一度MAXを測りましょう` };
    }
    return { key, label, tested, estimated: est, advice };
  });
}

const fmtKg = (v) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');

const round1 = (v) => Math.round(v * 10) / 10;
const dateOf = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

export { epley1RM };
