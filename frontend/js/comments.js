/**
 * comments.js — その月に書いたメモを読み解く
 *
 * AIは使わない。キーワードと出現日数だけで、次の3つに分ける。
 *   1. よく書いていたこと（複数の日に出てくる話題）
 *   2. 目を引いたもの（笑いや驚きの印がある、またはその月に1度だけ出た話題）
 *   3. 筋トレのことか、それ以外か
 *
 * 機械的な振り分けなので外すこともある。元の文は必ずそのまま残す。
 */

/** 筋トレの話だと判断する語。種目名・体の部位・トレ用語 */
const GYM_WORDS = [
  'kg', 'レップ', 'セット', '重量', 'ベンチ', 'スクワット', 'デッド', '懸垂', 'ディップス',
  'プレス', 'カール', 'ロウ', 'プルダウン', 'レイズ', 'フライ', 'アブローラー',
  'フォーム', '追い込', 'パンプ', '握力', '筋肉痛', '可動域', '補助', 'インターバル',
  '休憩', '更新', '自己ベスト', 'MAX', '挙が', '挙げ', '上がっ', '下ろ', '効い', '効く',
  'ジム', 'トレ', '筋', 'ウォームアップ', 'インクライン', 'デクライン', 'RPE',
  '胸', '背中', '肩', '腕', '腹', '脚', '腰', '膝', '肘', '手首', '前腕', '尻'
];

/** 笑いや驚きの印。ここが付いた文は拾い上げる */
const SPICE = /[笑wｗ！!？?]|www/;

/** 一文字でも話題になる語。体の部位など、短いが意味が重いもの */
const SHORT_WORDS = ['腰', '胸', '背', '肩', '腕', '脚', '膝', '肘', '首', '尻', '腹', '手', '足'];

/** 話題として数える語を文から抜く。形態素解析は使わず、字種のまとまりで拾う */
function terms(text) {
  const out = new Set();
  const t = String(text || '');
  (t.match(/[一-龥]{2,4}/g) || []).forEach((w) => out.add(w));
  (t.match(/[ァ-ヴー]{3,8}/g) || []).forEach((w) => out.add(w));
  SHORT_WORDS.forEach((w) => { if (t.includes(w)) out.add(w); });
  ['きつい', 'つらい', 'ねむい', 'だるい', '眠い', 'いい感じ', 'よかった', '軽い', '重い', '楽しい', '疲れ']
    .forEach((w) => { if (t.includes(w)) out.add(w); });
  return [...out];
}

/** 筋トレの話か、それ以外か */
export function classify(text) {
  const t = String(text || '');
  if (/\d+\s*(kg|キロ|レップ|回|セット)/.test(t)) return 'gym';
  return GYM_WORDS.some((w) => t.includes(w)) ? 'gym' : 'other';
}

/**
 * entries は [{date, text}]。日付順で渡す。
 * 返り値:
 *   themes     … 2日以上に出てきた話題 [{word, days}]
 *   summary    … themes から組み立てた文章（配列）
 *   highlights … 目を引いたもの { gym: [], other: [] }
 *   all        … 元の全件（分類付き）
 */
export function analyse(entries) {
  const list = (entries || [])
    .map((e) => ({ date: e.date, text: String(e.text || '').trim() }))
    .filter((e) => e.text);

  // 話題ごとに、出てきた日を数える
  const dayCount = new Map();
  list.forEach((e) => {
    terms(e.text).forEach((w) => {
      const set = dayCount.get(w) || new Set();
      set.add(e.date);
      dayCount.set(w, set);
    });
  });

  const themes = [...dayCount.entries()]
    .map(([word, days]) => ({ word, days: days.size }))
    .filter((t) => t.days >= 2)
    .sort((a, b) => b.days - a.days || b.word.length - a.word.length)
    .slice(0, 6);

  // その月に1度しか出なかった語を持つ文は「その日ならでは」とみなす
  const rare = new Set([...dayCount.entries()].filter(([, d]) => d.size === 1).map(([w]) => w));
  const maxLen = Math.max(0, ...list.map((e) => e.text.length));

  const scored = list.map((e) => {
    let score = 0;
    let why = '';
    if (SPICE.test(e.text)) { score += 3; why = 'ひとこと'; }
    const uniques = terms(e.text).filter((w) => rare.has(w)).length;
    if (uniques >= 2) { score += 2; why = why || 'この日だけの話'; }
    if (e.text.length === maxLen && maxLen >= 20) { score += 1; why = why || '一番長いメモ'; }
    return { ...e, kind: classify(e.text), score, why };
  });

  const pick = (kind) => scored
    .filter((e) => e.kind === kind && e.score > 0)
    .sort((a, b) => b.score - a.score || (a.date < b.date ? -1 : 1))
    .slice(0, 4);

  return {
    themes,
    summary: summarise(list, themes),
    highlights: { gym: pick('gym'), other: pick('other') },
    all: scored.sort((a, b) => (a.date < b.date ? -1 : 1))
  };
}

/** themes から、読める文章を2〜3本作る */
function summarise(list, themes) {
  if (!list.length) return ['今月はメモが残っていません。'];
  const out = [];
  const gym = list.filter((e) => classify(e.text) === 'gym').length;
  const other = list.length - gym;

  out.push(`${list.length}日ぶんのメモを書いています`
    + (gym && other ? `（筋トレのこと ${gym}件 ／ それ以外 ${other}件）。` : '。'));

  if (themes.length) {
    const top = themes.slice(0, 3).map((t) => `「${t.word}」${t.days}日`).join('、');
    out.push(`くり返し出てきたのは ${top}。同じことが気になっていた月でした。`);
  } else {
    out.push('同じ話題のくり返しは少なく、その日ごとに違うことを書いていました。');
  }
  return out;
}
