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

### `generate_component`

Figma のノードから HTML + CSS Modules のコンポーネントを生成し、`output/` フォルダに保存します。ノードツリーを再帰的に走査し、各要素のスタイル（色・サイズ・レイアウト・タイポグラフィ・シャドウ等）を CSS に変換します。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `figmaUrl` | string | ✅ | Figma の URL（`fileKey` と `nodeId` を自動抽出） |
| `componentName` | string | - | 出力ファイル名（省略時はノード名を使用） |

```
generate_component(
  figmaUrl: "https://www.figma.com/file/xxxxxxxxxx/...?node-id=1-1281",
  componentName: "my-button"
)
```

出力ファイル:
- `output/<componentName>.html`
- `output/<componentName>.module.css`

## プロジェクト構成

```
src/
├── index.ts              # サーバー起動・ツール登録
├── figma-client.ts       # Figma API クライアント
└── tools/                # ツールごとにファイルを分割
    ├── get-figma-image.ts
    └── generate-component.ts
output/                   # 生成された画像・コンポーネント（gitignore 済み）
```
