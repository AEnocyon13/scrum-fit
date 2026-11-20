# いま Supabase でやること

設定画面の体重、自重種目、MAX測定を使うために、**1回だけ SQL を実行**してください。

1. Supabase のダッシュボードを開く
2. 左の **SQL Editor** → **New query**
3. [`supabase/migrations/003_bodyweight_and_max.sql`](../supabase/migrations/003_bodyweight_and_max.sql)
   の中身をまるごと貼り付けて **Run**

## 何が変わるか

| 追加されるもの | 使いみち |
|---|---|
| `profiles.body_weight` | 設定画面の「体重」。自重種目のボリュームに足す |
| `workout_sets.is_max` | MAX測定（1レップ）かどうか |
| `workout_sets.body_weight_used` | その日の体重。後から体重を変えても過去の記録は動かない |
| `v_exercise_max` | 実測MAXのビュー。ホームのBIG3で使う |

あわせて次の2つも変わります。

- **レップ数の制約が `> 0` から `>= 0` に**なります。MAXに失敗したセットを 0 レップで残すためです。
- **ボリュームと推定1RMが「体重＋追加重量」で計算し直されます。**
  補助（アシスト）付きの懸垂はマイナスの重量で記録するので、`-20kg` なら
  体重 70kg の人で 50kg 換算になります。

実行しないと、体重・MAX・自重種目まわりで
`Could not find the 'body_weight' column` のようなエラーが出ます。
