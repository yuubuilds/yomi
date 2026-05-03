# Yomi

軽量テキストビューア。一瞬で開いて、気持ちよく読める。

## 特徴

- タブで複数ファイルを同時に開く
- シンタックスハイライト（JS / TS / Python / JSON / Markdown / CSS / HTML）
- 空白・タブ・改行コードの可視化
- 文字コード自動判定 + 切替（UTF-8 / Shift-JIS / EUC-JP / UTF-16）
- 改行コード変換（LF / CRLF / CR）
- フォント・文字サイズ変更
- ダーク / ライトテーマ
- ドラッグ＆ドロップでファイルを開く

## 技術スタック

- [Neutralinojs](https://neutralino.js.org/) — 軽量デスクトップアプリフレームワーク
- [CodeMirror 6](https://codemirror.net/) — エディタコンポーネント
- Vanilla JS / CSS

## 開発環境のセットアップ

```bash
npm install
npx @neutralinojs/neu update   # Neutralinojs バイナリをダウンロード
npm run dev                     # ビルド + 起動
```

## ビルド・配布

```bash
npm run package   # dist/yomi/ にバイナリを生成
```

Windowsインストーラーの作成は `installer/yomi_setup.iss` を [Inno Setup](https://jrsoftware.org/isdl.php) で開いてコンパイルしてください。

## License

[MIT](LICENSE)
