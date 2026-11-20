/**
 * recovery.js — 鍛えた筋肉が、いつまで回復中か
 *
 * 種目の解説に入っている「主筋」と「補助筋」を、その日 100% 使ったものとして数える。
 * 筋肉ごとに回復にかかる日数が違うので、部位で分けて持つ。
 *
 *   胸・背中・脚  … 3日
 *   肩・腕・腹    … 2日
 *   前腕          … 1日
 */

/** 筋肉の名前を、回復を管理する単位（部位）に寄せる */
const MUSCLE_REGION = {
  大胸筋: '胸', 前鋸筋: '胸',
  広背筋: '背中', 僧帽筋: '背中', 菱形筋: '背中', 大円筋: '背中', 脊柱起立筋: '背中',
  大腿四頭筋: '脚', ハムストリングス: '脚', 大臀筋: '脚', 下腿三頭筋: '脚',
  三角筋: '肩',
  上腕二頭筋: '腕', 上腕三頭筋: '腕', 上腕筋: '腕',
  腹直筋: '腹', 腹斜筋: '腹',
  前腕筋群: '前腕', 腕橈骨筋: '前腕', 手指屈筋群: '前腕'
};

/** 部位ごとの回復日数 */
export const RECOVERY_DAYS = { 胸: 3, 背中: 3, 脚: 3, 肩: 2, 腕: 2, 腹: 2, 前腕: 1 };
export const REGIONS = ['胸', '背中', '肩', '腕', '前腕', '腹', '脚'];

/** その種目が使う部位。解説が無ければ、種目の部位そのものを使う */
export function regionsOf(exercise) {
  const g = exercise?.guide;
  const names = [...(g?.muscles || []), ...(g?.assistMuscles || [])];
  const out = new Set(names.map((m) => MUSCLE_REGION[m]).filter(Boolean));
  if (!out.size && exercise?.part && RECOVERY_DAYS[exercise.part]) out.add(exercise.part);
  return [...out];
}

/**
 * 直近のセットから、部位ごとの回復状況を出す。
 * sets は [{date, part, exercise}]、catalog は state.exercises。
 * 返り値は REGIONS の順で [{region, days, since, ratio, ready}]。
 *   ratio … 0 = 鍛えた直後、1 = 回復済み
 */
export function recoveryOf(sets, catalog, today = new Date()) {
  const byKey = new Map(catalog.map((e) => [`${e.part}::${e.menu}`, e]));
  const last = new Map();                 // 部位 → 最後に使った日

  (sets || []).forEach((s) => {
    const ex = byKey.get(`${s.part}::${s.exercise}`) || { part: s.part };
    regionsOf(ex).forEach((r) => {
      const prev = last.get(r);
      if (!prev || s.date > prev) last.set(r, s.date);
    });
  });

  const t = startOfDay(today);
  return REGIONS.map((region) => {
    const days = RECOVERY_DAYS[region];
    const date = last.get(region) || null;
    if (!date) return { region, days, date: null, since: null, ratio: 1, ready: true };
    const since = Math.floor((t - startOfDay(parseDate(date))) / 86400000);
    const ratio = Math.max(0, Math.min(1, since / days));
    return { region, days, date, since, ratio, ready: ratio >= 1, remaining: Math.max(0, days - since) };
  });
}

const parseDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
