/**
 * report.js — 月まとめのPDF
 *
 * ライブラリは使わず、印刷用のスタイルを当てて window.print() に渡す。
 * ブラウザの「PDFとして保存」でそのまま残せるし、文字は画像にならないので
 * あとから検索もコピーもできる。iPhone でも 共有 → プリント → ファイルに保存。
 *
 * AIは使っていない。文章は記録とメモから組み立てている。
 */
import { esc, fmtVolume, fmtNum, fmtDateJP, fmtMinutes } from './ui.js';
import { analyse } from './comments.js';
import { platesSvg } from './plates.js';

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const mondayFirst = (dow) => (Number(dow) + 6) % 7;

/** 月のデータからレポートのHTMLを組み立てる */
export function reportHtml(d, profile) {
  const g = d.goal, t = d.totals;
  const notes = analyse((d.recentWorkouts || [])
    .filter((w) => w.memo)
    .map((w) => ({ date: w.date, text: w.memo }))
    .sort((a, b) => (a.date < b.date ? -1 : 1)));

  return `
    <article class="rp">
      <header class="rp__head">
        <div>
          <p class="rp__eyebrow">SCRUM FIT ／ 月まとめ</p>
          <h1 class="rp__title">${esc(d.monthLabel)}</h1>
        </div>
        <div class="rp__who">
          <div>${esc(profile?.display_name || '')}</div>
          <div class="rp__muted">作成 ${fmtDateJP(today())}</div>
        </div>
      </header>

      <section class="rp__sec">
        <h2>目標との差</h2>
        <p class="rp__lead">
          目標 ${g.targetWorkouts} 回に対して <b>${g.doneWorkouts} 回</b>（${fmtNum(g.achievementRate)}%）。
          ${g.doneWorkouts >= g.targetWorkouts
            ? '目標を達成しました。'
            : `${g.targetWorkouts - g.doneWorkouts} 回ぶん届きませんでした。`}
        </p>
        <table class="rp__table">
          <tbody>
            ${row('総ボリューム', fmtVolume(t.volume))}
            ${g.targetVolume > 0 ? row('ボリューム目標', `${fmtVolume(g.targetVolume)}（${fmtNum(g.volumeRate)}%）`) : ''}
            ${row('セット / レップ', `${t.sets} / ${t.reps}`)}
            ${row('合計トレーニング時間', fmtMinutes(t.minutes))}
            ${row('週あたりの平均日数', `${fmtNum(t.avgDaysPerWeek ?? 0)} 日`)}
            ${row('1回あたり', `${fmtVolume(t.avgVolumePerSession)} ／ ${fmtMinutes(t.avgMinutesPerSession)}`)}
          </tbody>
        </table>
      </section>

      <section class="rp__sec">
        <h2>部位のバランス</h2>
        ${d.byPart.length ? `
          <table class="rp__table">
            <tbody>
              ${d.byPart.map((p) => `
                <tr>
                  <th>${esc(p.part)}</th>
                  <td class="rp__bar"><i style="width:${Math.round(p.ratio)}%"></i></td>
                  <td class="rp__num">${fmtNum(p.ratio)}%</td>
                  <td class="rp__num rp__muted">${p.sessions}日 / ${p.sets}セット</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${balanceNote(d.byPart)}`
        : '<p class="rp__muted">記録がありません。</p>'}
      </section>

      <section class="rp__sec rp__sec--break">
        <h2>トレーニング日</h2>
        ${calendarHtml(d)}
      </section>

      <section class="rp__sec">
        <h2>BIG3</h2>
        <table class="rp__table">
          <tbody>
            ${(d.big3 || []).map((b) => {
              const w = b.tested?.w ?? b.estimated?.w ?? null;
              return `<tr>
                <th>${esc(b.label)}</th>
                <td class="rp__plates">${w === null ? '' : platesSvg(w)}</td>
                <td class="rp__num"><b>${w === null ? '—' : fmtNum(w) + 'kg'}</b></td>
                <td class="rp__muted">${b.tested ? `実測 ${fmtNum(b.tested.w)}kg` : '実測なし'}${
                  b.estimated ? ` ／ 理論値 ${fmtNum(b.estimated.w)}kg` : ''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </section>

      ${d.prs?.length ? `
        <section class="rp__sec">
          <h2>今月の自己ベスト更新</h2>
          <table class="rp__table">
            <tbody>
              ${d.prs.map((p) => `<tr>
                <th>${esc(p.menu)}</th>
                <td>${fmtNum(p.weight)}kg × ${p.reps}回</td>
                <td class="rp__num">+${fmtNum(p.gain)}kg</td>
                <td class="rp__muted">${fmtDateJP(p.date)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </section>` : ''}

      <section class="rp__sec rp__sec--break">
        <h2>今月のまとめ（メモから）</h2>
        ${notes.summary.map((line) => `<p class="rp__lead">${esc(line)}</p>`).join('')}
        ${notes.themes.length ? `
          <p class="rp__chips">${notes.themes.map((th) =>
            `<span class="rp__chip">${esc(th.word)}<small>${th.days}日</small></span>`).join('')}</p>` : ''}
      </section>

      ${(notes.highlights.gym.length || notes.highlights.other.length) ? `
        <section class="rp__sec">
          <h2>目を引いたメモ</h2>
          ${pickList('筋トレのこと', notes.highlights.gym)}
          ${pickList('それ以外', notes.highlights.other)}
        </section>` : ''}

      ${notes.all.length ? `
        <section class="rp__sec">
          <h2>全メモ</h2>
          <table class="rp__table rp__table--notes">
            <tbody>
              ${notes.all.map((n) => `<tr>
                <th>${fmtDateJP(n.date)}</th>
                <td>${esc(n.text)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </section>` : ''}

      <footer class="rp__foot">SCRUM FIT — ${esc(d.monthLabel)}の記録から作成</footer>
    </article>`;
}

const row = (k, v) => `<tr><th>${esc(k)}</th><td class="rp__num" colspan="3"><b>${v}</b></td></tr>`;

const pickList = (title, items) => items.length ? `
  <h3 class="rp__h3">${esc(title)}</h3>
  <ul class="rp__notes">
    ${items.map((n) => `<li>
      <span class="rp__date">${fmtDateJP(n.date)}</span>
      <span class="rp__text">${esc(n.text)}</span>
      <span class="rp__why">${esc(n.why)}</span>
    </li>`).join('')}
  </ul>` : '';

/** 部位の偏りをひとこと */
function balanceNote(byPart) {
  if (byPart.length < 2) return '';
  const top = byPart[0], bottom = byPart[byPart.length - 1];
  if (top.ratio < 40) return '<p class="rp__muted">部位の偏りは小さく、まんべんなく回せています。</p>';
  return `<p class="rp__muted">${esc(top.part)}に ${fmtNum(top.ratio)}% が寄っています。`
       + `${esc(bottom.part)}は ${fmtNum(bottom.ratio)}% なので、来月は配分を見直せます。</p>`;
}

function calendarHtml(d) {
  const maxVol = Math.max(1, ...d.calendar.map((c) => c.volume));
  return `
    <div class="rp__cal">
      ${DOW.map((w) => `<span class="rp__cal-dow">${w}</span>`).join('')}
      ${Array.from({ length: mondayFirst(d.calendar[0].dow) }, () => '<span></span>').join('')}
      ${d.calendar.map((c) => {
        const lv = c.volume === 0 ? 0 : Math.min(4, Math.ceil((c.volume / maxVol) * 4));
        return `<span class="rp__cal-day rp__cal-day--l${lv}">${c.day}</span>`;
      }).join('')}
    </div>
    <p class="rp__muted">色が濃いほどボリュームが大きい日です。</p>`;
}

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** レポートを作って印刷に渡す。ブラウザの「PDFとして保存」で残せる */
export function printReport(d, profile) {
  document.querySelector('#printArea')?.remove();
  const host = document.createElement('div');
  host.id = 'printArea';
  host.innerHTML = reportHtml(d, profile);
  document.body.appendChild(host);

  const cleanup = () => { host.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  // 画面に出してから印刷させる。Safari は同期で呼ぶと組版が間に合わないことがある
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
}
