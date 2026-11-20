# デザイン仕様（SCRUM CUBE と同じ設計）

姉妹サイト **SCRUM CUBE**（https://aenocyon13.github.io/scrum-cube/）と
同じ設計で組んでいる。2つ並べたときに、同じ人が作ったものだと分かる状態が目標。

| | 揃えているもの |
|---|---|
| 配色 | 緑のシード `#00a651` から起こした M3 Tonal Spot のカラーロール |
| 書体 | Zen Kaku Gothic New / Roboto + Noto Sans JP / Archivo / IBM Plex Mono |
| アイコン | Material Symbols Rounded |
| 形 | 4 / 8 / 12 / 16 / 28 / full |
| 影・動き | M3 のエレベーションと `cubic-bezier(0.2, 0, 0, 1)` |

ライブラリは使わず、トークンを CSS カスタムプロパティとして定義してコンポーネントを手書きしている
（ビルド不要・バンドル作業ゼロを維持するため）。
実装は [`frontend/css/style.css`](../frontend/css/style.css) の1ファイルに集約。

---

## 1. カラー

ライトが既定。ダークは同じ緑のシードから起こした M3 のダークで、昼夜で別物にはしない。

| ロール | ライト | ダーク |
|---|---|---|
| `surface` / `on-surface` | `#f6fbf2` / `#181d18` | `#101510` / `#dfe4dc` |
| `primary` / `on-primary` | `#336940` / `#ffffff` | `#99d4a2` / `#04391a` |
| `primary-container` | `#b5f1bd` | `#1b5130` |
| `secondary-container` | `#d3e8d2` | `#394b3b` |
| `tertiary` | `#39656e` | `#a1ced8` |
| `outline` / `outline-variant` | `#717970` / `#c1c9be` | `#8b938a` / `#414941` |

### 「いま」の色

SCRUM CUBE には **いま回している1手**を指す色 `--now`（`#d81b72`）がある。
LiftLog ではそれを **いま進行中のセット・動いているタイマー・今日** に充てた。
役割が同じなので、色も同じにしてある。

### 色の役割

- **緑（primary）** … 達成・完了・いま押すべきもの
- **ティール（tertiary）** … 過去と情報
- **ピンク（--ll-now）** … いま進行中
- **赤（error）** … 失敗と削除
- **プレートの色** … [プレート表示](#16-プレート表示このアプリの顔)の中だけ

データに色を使うのはプレート表示だけ。それ以外は上の4つで足りる。

---

## 1.5 2Dだけで作る

以前は Three.js で4か所に3Dを置いていたが、**全部やめて2Dにした**。
端末によって描画が落ちたり、読み込みに失敗したりして、動かないことがあったため。

| もとの3D | いまの形 |
|---|---|
| ホーム背景のバーベル | 置かない。「次に持つ重さ」とプレート表示が主役 |
| 部位選択の人体 | SVG の人体図（[`frontend/js/bodyMap.js`](../frontend/js/bodyMap.js)） |
| 完了時の演出 | 置かない。スナックバーで結果を伝える |
| レポートの立体の棒 | 2Dの棒グラフ |

Three.js への依存も、設定画面の「3Dの演出」の切り替えも消えている。

### 人体図

前面と背面を**並べて**置く。部位を選ぶのに回転は要らないし、並べれば一度に全部見える。
部位ごとに SVG のグループを作り、塗りを変えるだけで選択を表す。
図の台（`.ll-stage`）は SCRUM CUBE のステージと同じ、薄いドットを敷いた地。

---

## 1.6 プレート表示（このアプリの顔）

重量だけ見せられても、ジムでは「で、何を付ければいいの？」が残る。
国際規格のプレートは色が決まっていて、通っている人は色で量を読む。
だから重量の横に、**実際にバーへ付ける枚数をその色で並べる**
（[`frontend/js/plates.js`](../frontend/js/plates.js)）。

```
 87.5kg   ●●○▮▮○●●    片側 25kg + 5kg + 2.5kg + 1.25kg
120.0kg   ●●●▮▮●●●    片側 25kg×2
```

| kg | 色 |
|---|---|
| 25 | 赤 `#d7263d` |
| 20 | 青 `#1e5fbe` |
| 15 | 黄 `#f0c000` |
| 10 | 緑 `#1c9e4b` |
| 5 | 白 `#e9edf4` |
| 2.5 | 赤（小） |
| 1.25 | クロム `#a9b3c4` |

バー20kgを引いて2で割り、重い順に貪欲に選ぶ。出る場所は4つ
（ホームの「次に持つ重さ」／重量の確認画面／ワークアウト中の種目カード／レポートの日別詳細）。
**バーベル種目のときだけ出す。** ダンベルやマシンでは意味がない。

SCRUM CUBE のロゴがキューブの色を3×3に並べた印であるのと同じ考え方で、
LiftLog のロゴ印はプレートの色を並べたものにしてある。

---

## 1.7 素材の階層

カードだらけの画面は、全部が同じ重さに見える。3段に分ける。

| 段 | 使い方 |
|---|---|
| 記録用紙（`.ll-sheet`） | 塗らない。罫線の上に数字を置く。月間の集計はこれ |
| カード（`.md-card--elevated`） | 塗る。ひとかたまりの情報 |
| 一覧の行（`.md-list-item`） | 塗る＋押せる |

---

## 2. タイポグラフィ

SCRUM CUBE と同じ4本立て。

| 用途 | 書体 |
|---|---|
| 見出し | **Zen Kaku Gothic New** 500・700 |
| 本文・ラベル | **Roboto** ＋ **Noto Sans JP** 400・500・700 |
| ワードマーク | **Archivo** wdth 112 / 700・800 |
| 数字（重量・レップ・タイマー） | **IBM Plex Mono** 400・500・600 |

数字を等幅にしているのは、重量とレップが桁で揃うから。
記録を縦に並べたときに数字が左右に泳がない。
大きく使うときは字送りを `-.04em` 前後まで詰めて、塊に見せる。

小見出しは SCRUM CUBE の `.eyebrow` と同じ扱い。
12px / 字間 `.12em` / 緑。見出しというより「ラベル」として置く。

---

## 3. 形状・エレベーション・状態

| トークン | 値 | 主な用途 |
|---|---|---|
| `--md-sys-shape-corner-extra-small` | 4px | テキストフィールド、スナックバー |
| `--md-sys-shape-corner-small` | 8px | チップ、カレンダーのセル |
| `--md-sys-shape-corner-medium` | 12px | カード、リストアイテム |
| `--md-sys-shape-corner-large` | 16px | Extended FAB |
| `--md-sys-shape-corner-extra-large` | 28px | ボトムシート |
| `--md-sys-shape-corner-full` | 9999px | ボタン、ナビゲーションのインジケーター |

エレベーションは M3 の Level 0〜5 の2段重ねシャドウを `--md-sys-elevation-*` として定義。

状態レイヤーは M3 規定の不透明度（hover 8% / focus 10% / pressed 10%）を `.md-state` クラスで適用する。
`::after` に `currentColor` を重ねる方式なので、どのコンテナ色の上でも自然に効く。

モーションは `--md-sys-motion-easing-standard` / `-emphasized` と short4/medium2/long2 のデュレーションを使用。
`prefers-reduced-motion: reduce` の環境ではすべてのアニメーションを無効化している。

---

## 4. 実装しているコンポーネント

| M3 コンポーネント | クラス | 使用箇所 |
|---|---|---|
| Top app bar (small) | `.md-top-app-bar` | 全画面。スクロールで `surface-container` に持ち上がる |
| Navigation bar | `.md-navigation-bar` | 下部4タブ。選択項目にピル型インジケーター |
| Extended FAB | `.md-fab-extended` | ホームの「ワークアウト開始 / 再開」 |
| Common buttons | `.md-button--filled / --tonal / --outlined / --elevated / --text` | 全画面 |
| Icon button | `.md-icon-button` | 解説を開く、セット削除 |
| Segmented button | `.md-segmented` | テーマ切替、月の前後移動 |
| Cards (elevated / filled / outlined) | `.md-card--elevated / --filled / --outlined` | 全画面 |
| Chips (filter / assist) | `.md-chip` | 部位選択、ステータス表示、±クイック調整 |
| Text fields (outlined) | `.md-field` | 設定、セット入力、メモ |
| Lists | `.md-list-item` | メニュー選択、解説一覧、記録一覧 |
| Progress indicators | `.md-circular-progress` / `.md-linear-progress` | 達成度リング、部位別ボリューム |
| Switch | `.md-switch` | （予備） |
| Bottom sheet / Dialog | `.md-sheet` / `.md-dialog__*` | 種目解説、確認ダイアログ |
| Snackbar | `.md-snackbar` | 保存完了・エラー通知 |
| Text field (ログイン) | `.ll-login` | 名前の選択と4桁PIN。PIN欄は字間を広げた専用スタイル |
| 休憩タイマー | `.ll-rest` | 実行中はトップアプリバー直下に sticky で固定。作動中は primary の枠線、終了時は primary-container に反転して点滅 |
| 今回のプラン | `.ll-plan` | セットごとの「重量 × レップ」。前回値を右端に添える |
| Divider | `.md-divider` | カード内の区切り |

アプリ固有の組み合わせ（統計タイル、提案カード、セット入力グリッド、カレンダー）は
`.ll-` 接頭辞で分けており、M3 のトークンのみを参照している。

---

## 5. アイコン

**Material Symbols Rounded**（SCRUM CUBE と同じ）。
呼び出し側は `icon('play')` のような短い名前のままでよく、
[`frontend/js/ui.js`](../frontend/js/ui.js) の `SYMBOL` で実際の記号名に読み替えている。

選択中の項目（ナビの現在タブ、選んだ種目）は `'FILL' 1` にして塗りつぶす。

---

## 6. アクセシビリティ

- タップ領域は M3 の最小 48×48dp を満たす（ボタン高40px + 状態レイヤー、アイコンボタンは48px）
- `:focus-visible` に `secondary` 色の3pxアウトラインを付与
- ナビゲーションの現在地に `aria-current="page"`、進捗に `role="progressbar"` と `aria-valuenow`
- スナックバーは `role="status" aria-live="polite"`
- 主要な配色のコントラスト比（実測値）。すべて WCAG AA（4.5:1）以上、本文は AAA（7:1）以上。

| 組み合わせ | 比 |
|---|---|
| 本文 TEAL T22 on CREAM T94（ライト／ダークとも同値） | 10.46:1 |
| `on-surface-variant` — ライト / ダーク | 6.75:1 / 7.04:1 |
| Extended FAB のラベル — ライト / ダーク | 8.85:1 / 7.21:1 |
| Navigation bar の選択インジケーター — ライト / ダーク | 9.74:1 / 6.00:1 |
| `error` — ライト / ダーク | 5.61:1 / 7.09:1 |
