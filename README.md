# figma-mcp

Figma を操作する MCP サーバーです。Claude Code から Figma のデータを取得・操作できます。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

```.env
FIGMA_TOKEN=your_figma_token_here
```

> Figma Token の取得: [Figma 設定 → Security → Personal Access Tokens](https://www.figma.com/settings)

### 3. ビルド

```bash
npm run build
```

### 4. Claude Code への登録

`.mcp.json` がプロジェクトルートに配置されているため、Claude Code でこのディレクトリを開くと自動的に MCP サーバーが起動します。

## ツール一覧

### `get_figma_image`

指定したノードの画像をダウンロードし、`output/` フォルダに保存します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `figmaUrl` | string | ✅ | Figma の URL（`fileKey` と `nodeId` を自動抽出） |
| `format` | `png` \| `svg` \| `jpg` | - | 画像フォーマット（デフォルト: `png`） |
| `scale` | number | - | スケール倍率 0.5〜4（デフォルト: `2`） |

```
get_figma_image(
  figmaUrl: "https://www.figma.com/file/xxxxxxxxxx/...?node-id=1-1281",
  format: "png"
)
```

## プロジェクト構成

```
src/
├── index.ts         # サーバー起動・ツール登録
├── figma-client.ts  # Figma API クライアント
└── tools/           # ツールごとにファイルを分割
    └── get-figma-image.ts
output/              # 保存された画像（gitignore 済み）
```
