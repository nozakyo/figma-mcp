import axios from "axios";

const BASE_URL = "https://api.figma.com/v1";

function getClient() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN が設定されていません");
  return axios.create({
    baseURL: BASE_URL,
    headers: { "X-Figma-Token": token },
  });
}

/** ファイル内のノード情報を取得 */
export async function getNode(fileKey: string, nodeId: string) {
  const client = getClient();
  const res = await client.get(`/files/${fileKey}/nodes`, {
    params: { ids: nodeId },
  });
  const nodes = res.data.nodes as Record<string, { document: FigmaNode }>;
  const entry = nodes[nodeId];
  if (!entry) throw new Error(`ノード ${nodeId} が見つかりません`);
  return entry.document;
}

/** 指定ノードを画像URLとして取得 */
export async function getNodeImageUrl(
  fileKey: string,
  nodeId: string,
  format: "png" | "svg" | "jpg" = "png",
  scale = 2
): Promise<string> {
  const client = getClient();
  const res = await client.get(`/images/${fileKey}`, {
    params: { ids: nodeId, format, scale },
  });
  const images = res.data.images as Record<string, string>;
  const url = images[nodeId];
  if (!url) throw new Error("画像URLの取得に失敗しました");
  return url;
}

// ────────── 型定義 ──────────
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  backgroundColor?: FigmaColor;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  characters?: string;
  style?: FigmaTypeStyle;
  opacity?: number;
  children?: FigmaNode[];
  effects?: FigmaEffect[];
  constraints?: { vertical: string; horizontal: string };
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  type: string;
  color?: FigmaColor;
  opacity?: number;
  gradientStops?: Array<{ color: FigmaColor; position: number }>;
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: string;
  italic?: boolean;
  textDecoration?: string;
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}