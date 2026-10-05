# 終末のゼロ

音声でゼロに指示するブラウザゲームです。ゲーム本体は `dist/` にあります。

## 起動

[GitHub Pagesでプレイ](https://nagisa793.github.io/syuumatsu_no_zero/)

`dist/index.html` からゲームを配信します。`main` への更新時に GitHub Actions が `dist/` を GitHub Pages に反映します。ゲームのロジック検証は `node --test tests/battle.cjs` で実行できます。
