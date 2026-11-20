/**
 * bodyMap.js — 部位を選ぶための2Dの人体図
 *
 * 3Dをやめた理由：端末によって描画が落ちたり、回したときに見失ったりする。
 * 部位を選ぶのに回転は要らない。前と後ろを並べて置けば、一度に全部見える。
 * 解剖図と同じ構えなので、どこを押せばいいかも迷わない。
 *
 * 図は SVG のパスで、部位ごとに1つのグループ。塗りを変えるだけで選択を表せる。
 */

export const BODY_PARTS = ['肩', '胸', '背中', '腕', '腹', '脚'];

/* 前面。viewBox 0 0 100 200、体の中心が x=50、身長はおよそ 185 */
const FRONT = {
  _base: [
    // 頭
    'M50 10c-6.4 0-11 5-11 11.5S43.6 34 50 34s11-5 11-12.5S56.4 10 50 10z',
    // 首
    'M45.5 32.5h9v6.5h-9z',
    // 胴（肋郭から腰へ絞る）
    'M50 37c-8 0-14 1.4-15.5 3.6l-2 20.4c0 6 .8 11.6 2 17l1.6 10.4h27.8L65.5 78c1.2-5.4 2-11 2-17l-2-20.4C64 38.4 58 37 50 37z',
    // 骨盤
    'M36.1 90.4 38 106c0 3.6 5 5.6 12 5.6s12-2 12-5.6l1.9-15.6z',
    // 肘
    'M24.3 78.8a3.4 3.4 0 1 0 .1 0zM75.7 78.8a3.4 3.4 0 1 0-.1 0z',
    // 手
    'M18.6 107c-2.4 0-3.6 3.4-2.8 8.2.8 4.6 3.4 6.4 5.6 4.8 1.8-1.4 2-8.6.4-11.6z',
    'M81.4 107c2.4 0 3.6 3.4 2.8 8.2-.8 4.6-3.4 6.4-5.6 4.8-1.8-1.4-2-8.6-.4-11.6z',
    // 膝
    'M40.6 150.5a4.3 4.3 0 1 0 .1 0zM59.4 150.5a4.3 4.3 0 1 0-.1 0z',
    // 足
    'M37.4 184c-2 0-4.2 3-3.4 6.6h12.6l.4-6.6z',
    'M62.6 184c2 0 4.2 3 3.4 6.6H53.4l-.4-6.6z'
  ],
  肩: [
    'M34.5 40.6c-6 1.2-9.8 5.4-11 12.4-1 5.6 1.6 8.6 5.6 7.6 3.6-1 5-7 6.2-13.4z',
    'M65.5 40.6c6 1.2 9.8 5.4 11 12.4 1 5.6-1.6 8.6-5.6 7.6-3.6-1-5-7-6.2-13.4z'
  ],
  胸: [
    'M48.6 42.2c-5.4-.2-10.6 1-13 3.6-2.2 2.4-2.2 8.6-.4 12 1.8 3.4 7 4.8 10.6 3.4 2.4-1 3-4 2.8-7.4z',
    'M51.4 42.2c5.4-.2 10.6 1 13 3.6 2.2 2.4 2.2 8.6.4 12-1.8 3.4-7 4.8-10.6 3.4-2.4-1-3-4-2.8-7.4z'
  ],
  腹: [
    'M44 66.4h5.2c.6 0 1 .4 1 1v6.2c0 .6-.4 1-1 1H44c-.6 0-1-.4-1-1v-6.2c0-.6.4-1 1-1z',
    'M50.8 66.4H56c.6 0 1 .4 1 1v6.2c0 .6-.4 1-1 1h-5.2c-.6 0-1-.4-1-1v-6.2c0-.6.4-1 1-1z',
    'M44.2 76.8h5c.6 0 1 .4 1 1V84c0 .6-.4 1-1 1h-5c-.6 0-1-.4-1-1v-6.2c0-.6.4-1 1-1z',
    'M50.8 76.8h5c.6 0 1 .4 1 1V84c0 .6-.4 1-1 1h-5c-.6 0-1-.4-1-1v-6.2c0-.6.4-1 1-1z',
    'M44.6 87h4.6c.6 0 1 .4 1 1v5.6c0 .6-.4 1-1 1h-4.6c-.6 0-1-.4-1-1V88c0-.6.4-1 1-1z',
    'M50.8 87h4.6c.6 0 1 .4 1 1v5.6c0 .6-.4 1-1 1h-4.6c-.6 0-1-.4-1-1V88c0-.6.4-1 1-1z',
    // 外腹斜筋
    'M36.4 70c-2.6 4.6-2.8 14-1 21.4l4.4-1.6c-1.6-6.8-1.4-13.6.2-19.2z',
    'M63.6 70c2.6 4.6 2.8 14 1 21.4l-4.4-1.6c1.6-6.8 1.4-13.6-.2-19.2z'
  ],
  腕: [
    'M28.4 48.8c-5 2.4-8 12-7.8 22.2.2 7 3.6 9.6 6.8 7 3.4-2.8 4.6-18.4 3.6-27z',
    'M71.6 48.8c5 2.4 8 12 7.8 22.2-.2 7-3.6 9.6-6.8 7-3.4-2.8-4.6-18.4-3.6-27z'
  ],
  前腕: [
    'M22.6 82.6c-3.4 3-5.6 12.6-4.8 21 .4 4.6 4.4 5.6 6.2 1.8 2-4.4 2.6-16.2 1.6-21.6z',
    'M77.4 82.6c3.4 3 5.6 12.6 4.8 21-.4 4.6-4.4 5.6-6.2 1.8-2-4.4-2.6-16.2-1.6-21.6z'
  ],
  脚: [
    // 大腿
    'M37.8 109.4c-4.6 8.8-5 27-2.2 41 1.6 8.2 8 8.4 10 1 2.4-9 3-29.6 2.2-42z',
    'M62.2 109.4c4.6 8.8 5 27 2.2 41-1.6 8.2-8 8.4-10 1-2.4-9-3-29.6-2.2-42z',
    // 下腿
    'M38.6 154.6c-3.6 6.6-4.4 20.8-2.4 30.4 1 4.4 7.4 4.4 8.6-.4 1.4-5.6 1-20-.6-29z',
    'M61.4 154.6c3.6 6.6 4.4 20.8 2.4 30.4-1 4.4-7.4 4.4-8.6-.4-1.4-5.6-1-20 .6-29z'
  ]
};

/* 背面。同じ骨格に背中の筋肉を載せる */
const BACK = {
  _base: FRONT._base,
  肩: FRONT.肩,
  腕: FRONT.腕,
  前腕: FRONT.前腕,
  脚: FRONT.脚,
  背中: [
    // 僧帽筋
    'M50 37c-5.6 0-11 .8-14.2 2.2 1.6 8.4 4.2 15 8.2 19 2 2 10 2 12 0 4-4 6.6-10.6 8.2-19C61 37.8 55.6 37 50 37z',
    // 広背筋
    'M36.6 48.4c-3.6 7.4-4.6 20.4-2.6 32.6l9.6 8.4c-.8-14.4-1.6-27.6.4-39.4z',
    'M63.4 48.4c3.6 7.4 4.6 20.4 2.6 32.6l-9.6 8.4c.8-14.4 1.6-27.6-.4-39.4z',
    // 脊柱起立筋
    'M47 60.4h2.4v30H47zM50.6 60.4H53v30h-2.4z'
  ],
  腹: []
};

const LABEL = {
  肩: '三角筋', 胸: '大胸筋', 背中: '広背筋・僧帽筋',
  腕: '上腕・前腕', 前腕: '前腕', 腹: '腹直筋・腹斜筋', 脚: '大腿・下腿'
};

function figure(map, parts, side, sel, recovery = null) {
  const recByRegion = recovery ? new Map(recovery.map((r) => [r.region, r])) : null;
  const base = (map._base || []).map((d) => `<path d="${d}" class="ll-body__base"/>`).join('');
  const groups = parts.map((p) => {
    const paths = map[p];
    if (!paths || !paths.length) return '';

    if (recByRegion) {
      const r = recByRegion.get(p);
      // 回復しきっていないほど濃い。回復済みは地の色に溶ける
      const load = r && r.since !== null ? 1 - r.ratio : 0;
      const label = !r || r.since === null ? `${p} 記録なし`
        : r.ready ? `${p} 回復済み` : `${p} あと${r.remaining}日`;
      return `<g class="ll-body__part ll-body__part--rec" data-part="${p}"
                 style="--load:${load.toFixed(2)}"><title>${label}</title>
        ${paths.map((d) => `<path d="${d}"/>`).join('')}
      </g>`;
    }

    const on = sel.includes(p);
    return `<g class="ll-body__part ${on ? 'is-selected' : ''}" data-part="${p}" role="button" tabindex="0"
               aria-label="${p}（${LABEL[p]}）を選ぶ" aria-pressed="${on}">
      ${paths.map((d) => `<path d="${d}"/>`).join('')}
    </g>`;
  }).join('');
  return `<svg class="ll-body__svg" viewBox="0 0 100 200" data-side="${side}"
               role="group" aria-label="${side === 'front' ? '体の前面' : '体の背面'}">
    ${base}${groups}
  </svg>`;
}

/**
 * 人体図を描く。parts は実際に種目が登録されている部位だけを渡す。
 * selected に入っている部位が塗られる。
 */
/**
 * 人体図。
 *  ふつう（部位を選ぶ）  … parts に出したい部位、selected に選択中のもの
 *  回復表示             … opts.recovery に recoveryOf() の結果を渡す。
 *                          タップできない図になり、回復の進み具合で濃さが変わる。
 */
export function bodyMapHtml(parts, selected = [], { recovery = null } = {}) {
  if (recovery) {
    const regions = recovery.map((r) => r.region);
    const front = regions.filter((p) => FRONT[p] && FRONT[p].length);
    const back = regions.filter((p) => BACK[p] && BACK[p].length);
    return `<div class="ll-body ll-body--readonly ll-stage">
      <div class="ll-body__figures">
        <figure class="ll-body__fig">${figure(FRONT, front, 'front', [], recovery)}<figcaption>前</figcaption></figure>
        <figure class="ll-body__fig">${figure(BACK, back, 'back', [], recovery)}<figcaption>後</figcaption></figure>
      </div>
    </div>`;
  }

  // 選ぶ図では、前腕は腕の一部として見せる（DBに「前腕」という部位は無いため）
  const merged = (map) => ({ ...map, 腕: [...(map.腕 || []), ...(map.前腕 || [])] });
  const front = parts.filter((p) => FRONT[p]);
  const back = parts.filter((p) => BACK[p] && BACK[p].length);
  return `<div class="ll-body ll-stage">
    <div class="ll-body__figures">
      <figure class="ll-body__fig">${figure(merged(FRONT), front, 'front', selected)}<figcaption>前</figcaption></figure>
      <figure class="ll-body__fig">${figure(merged(BACK), back, 'back', selected)}<figcaption>後</figcaption></figure>
    </div>
    <p class="ll-body__hint">鍛える部位をタップしてください</p>
  </div>`;
}

/** 選択状態を描き直す。図を作り直さないので、押した瞬間に色が変わる */
export function paintBodyMap(root, selected) {
  root.querySelectorAll('.ll-body__part').forEach((g) => {
    const on = selected.includes(g.dataset.part);
    g.classList.toggle('is-selected', on);
    g.setAttribute('aria-pressed', String(on));
  });
}
