# 終末のゼロ

アカリが技を選び、ゼロが自動で戦うドット絵のブラウザゲームです。

- 公開ゲーム: https://nagisa793.github.io/syuumatsu_no_zero/
- もう一つの公開先: https://shumatsu-zero-battle.nagisa793.chatgpt.site/

GitHub Pagesはこのリポジトリの `dist/` をそのまま配信します。別のサイトへの自動転送はありません。

## 遊び方

1. 黒い画面のTOUCH!を押すと音が有効になり、約13秒の映像が始まります。映像中にもう一度タップ／クリックするとホームへスキップできます。ホーム画面でSTARTを押します。
2. TARGET中に使いたい技を最大5個選び、敵の番号を選びます。
3. 「技を使う」で、登録した技を先頭から一つずつ実行します。ゼロの移動と通常攻撃は自動です。
4. 攻撃できる位置に届かない技は待機します。待機中に「技を使う」を押すと、その技を取り消して次に進みます。

技は全19種で、それぞれ1戦につき3回まで使用できます。バッテリーは戦闘中に回復しません。ウィングで飛行でき、着地はターゲットの変更待ち時間中も使えます。操作はタップ／クリック式で、マイクや音声認識モデルは使いません。

## 音について

TOUCH!で音を有効にしてから映像を始めます。映像が終わるかスキップするとホームBGMが始まります。BGMと効果音の音量は一時停止メニューで個別に調整できます。

## 開発と公開

`dist/` はビルド不要のHTML・JavaScript・画像・音声です。ローカル確認は `python -m http.server 8000 --directory dist` で起動し、http://localhost:8000/ を開きます。

GitHub Actionsの `Publish game to GitHub Pages` が、main更新時に `dist/` をGitHub Pagesへ公開します。リポジトリのPages設定は「GitHub Actions」を使用してください。

音声の回帰テストは `node tests/audio.cjs`、戦闘・画面の回帰テストは `node tests/dialogue.cjs` です。後者は `@napi-rs/canvas` が必要です。元画像や音楽生成用スクリプトは `scripts/` に保存しています。
