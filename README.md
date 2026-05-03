# Yomi

軽量テキストビューア。一瞬で開いて、気持ちよく読める。

![Welcome screen](docs/screenshot_welcome.png)

![Editor](docs/screenshot_editor.png)

## 特徴

- タブで複数ファイルを同時に開く
- シンタックスハイライト（JS / TS / Python / JSON / Markdown / CSS / HTML）
- 空白・タブ・改行コードの可視化
- 文字コード自動判定 + 切替（UTF-8 / Shift-JIS / EUC-JP / UTF-16）
- 改行コード変換（LF / CRLF / CR）
- フォント・文字サイズ変更
- ダーク / ライトテーマ
- ドラッグ＆ドロップでファイルを開く

## インストール（Windows）

### A. インストーラーを使う（推奨）

1. [Releases](https://github.com/yuubuilds/yomi/releases) から `yomi_setup.exe` をダウンロード
2. ダブルクリックして実行 → 画面の指示に従ってインストール
3. スタートメニューまたはデスクトップのショートカットから起動

> インストーラーのビルド方法は下の「開発者向け」を参照してください。

### B. バイナリを直接使う（インストール不要）

1. [Releases](https://github.com/yuubuilds/yomi/releases) から `yomi-portable.zip` をダウンロード
2. 任意のフォルダに展開
3. `yomi.exe` をダブルクリックして起動

---

## 開発者向け

### 必要なもの

- [Node.js](https://nodejs.org/) v18 以上

### セットアップ

```bash
git clone https://github.com/yuubuilds/yomi.git
cd yomi
npm install
npx @neutralinojs/neu update   # Neutralinojs バイナリをダウンロード
```

### 開発サーバー起動

```bash
npm run dev
```

### バイナリのビルド

```bash
npm run package
# → dist/yomi/ にバイナリが生成されます
```

### Windowsインストーラーのビルド

1. [Inno Setup](https://jrsoftware.org/isdl.php) をインストール
2. `npm run package` でバイナリを先にビルド
3. `installer/yomi_setup.iss` を Inno Setup で開く
4. `Build → Compile` を実行 → `installer/Output/yomi_setup.exe` が生成されます

## 技術スタック

- [Neutralinojs](https://neutralino.js.org/) — 軽量デスクトップアプリフレームワーク
- [CodeMirror 6](https://codemirror.net/) — エディタコンポーネント
- Vanilla JS / CSS

## License

[MIT](LICENSE)
