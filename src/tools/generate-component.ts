import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getNode, FigmaNode, FigmaColor } from "../figma-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../../output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function toRgba(color: FigmaColor, opacity = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a * opacity})`;
}

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function mapAxisAlign(value: string): string {
  const map: Record<string, string> = {
    FLEX_START: "flex-start",
    MIN: "flex-start",
    CENTER: "center",
    FLEX_END: "flex-end",
    MAX: "flex-end",
    SPACE_BETWEEN: "space-between",
    BASELINE: "baseline",
  };
  return map[value] ?? value.toLowerCase();
}

function nodeToCSS(node: FigmaNode): string {
  const props: string[] = [];

  if (node.absoluteBoundingBox) {
    props.push(`width: ${node.absoluteBoundingBox.width}px`);
    props.push(`height: ${node.absoluteBoundingBox.height}px`);
  }

  const isText = node.type === "TEXT";

  if (node.fills && node.fills.length > 0) {
    for (const fill of node.fills) {
      if (fill.type === "SOLID" && fill.color) {
        const cssColor = toRgba(fill.color, fill.opacity ?? 1);
        props.push(isText ? `color: ${cssColor}` : `background-color: ${cssColor}`);
        break;
      }
    }
  }

  if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
    const stroke = node.strokes[0];
    if (stroke.type === "SOLID" && stroke.color) {
      props.push(`border: ${node.strokeWeight}px solid ${toRgba(stroke.color)}`);
    }
  }

  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    if (tl === tr && tr === br && br === bl) {
      props.push(`border-radius: ${tl}px`);
    } else {
      props.push(`border-radius: ${tl}px ${tr}px ${br}px ${bl}px`);
    }
  } else if (node.cornerRadius) {
    props.push(`border-radius: ${node.cornerRadius}px`);
  }

  if (node.opacity !== undefined && node.opacity !== 1) {
    props.push(`opacity: ${node.opacity}`);
  }

  if (node.layoutMode && node.layoutMode !== "NONE") {
    props.push("display: flex");
    props.push(`flex-direction: ${node.layoutMode === "HORIZONTAL" ? "row" : "column"}`);
    if (node.itemSpacing) props.push(`gap: ${node.itemSpacing}px`);

    const pt = node.paddingTop ?? 0;
    const pr = node.paddingRight ?? 0;
    const pb = node.paddingBottom ?? 0;
    const pl = node.paddingLeft ?? 0;
    if (pt || pr || pb || pl) {
      if (pt === pr && pr === pb && pb === pl) {
        props.push(`padding: ${pt}px`);
      } else {
        props.push(`padding: ${pt}px ${pr}px ${pb}px ${pl}px`);
      }
    }

    if (node.primaryAxisAlignItems) {
      props.push(`justify-content: ${mapAxisAlign(node.primaryAxisAlignItems)}`);
    }
    if (node.counterAxisAlignItems) {
      props.push(`align-items: ${mapAxisAlign(node.counterAxisAlignItems)}`);
    }
  }

  if (node.style) {
    const s = node.style;
    if (s.fontFamily) props.push(`font-family: '${s.fontFamily}', sans-serif`);
    if (s.fontSize) props.push(`font-size: ${s.fontSize}px`);
    if (s.fontWeight) props.push(`font-weight: ${s.fontWeight}`);
    if (s.lineHeightPx) props.push(`line-height: ${s.lineHeightPx}px`);
    if (s.letterSpacing) props.push(`letter-spacing: ${s.letterSpacing}px`);
    if (s.italic) props.push("font-style: italic");
    if (s.textDecoration && s.textDecoration !== "NONE") {
      props.push(`text-decoration: ${s.textDecoration.toLowerCase()}`);
    }
    if (s.textAlignHorizontal) {
      const textAlignMap: Record<string, string> = {
        LEFT: "left",
        CENTER: "center",
        RIGHT: "right",
        JUSTIFIED: "justify",
      };
      const textAlign = textAlignMap[s.textAlignHorizontal];
      if (textAlign) props.push(`text-align: ${textAlign}`);
    }
  }

  if (node.effects) {
    const shadows = node.effects
      .filter(e => e.type === "DROP_SHADOW" && e.visible !== false && e.color && e.offset)
      .map(e => {
        const { x, y } = e.offset!;
        const blur = e.radius ?? 0;
        const spread = e.spread ?? 0;
        return `${x}px ${y}px ${blur}px ${spread}px ${toRgba(e.color!)}`;
      });
    if (shadows.length > 0) props.push(`box-shadow: ${shadows.join(", ")}`);
  }

  return props.join(";\n  ");
}

function sanitizeClassName(name: string, usedNames: Set<string>): string {
  let base = toKebabCase(name) || "element";
  if (!base.match(/^[a-z]/)) base = `el-${base}`;
  let className = base;
  let i = 2;
  while (usedNames.has(className)) {
    className = `${base}-${i++}`;
  }
  usedNames.add(className);
  return className;
}

function buildTree(
  node: FigmaNode,
  cssMap: Map<string, string>,
  usedNames: Set<string>,
  depth: number
): string {
  const indent = "  ".repeat(depth);
  const className = sanitizeClassName(node.name, usedNames);
  const css = nodeToCSS(node);
  if (css) cssMap.set(className, css);

  const tag = node.type === "TEXT" ? "p" : "div";
  const content = node.characters ?? "";

  if (!node.children || node.children.length === 0) {
    return `${indent}<${tag} class="${className}">${content}</${tag}>`;
  }

  const children = node.children
    .map(child => buildTree(child, cssMap, usedNames, depth + 1))
    .join("\n");

  return `${indent}<${tag} class="${className}">\n${children}\n${indent}</${tag}>`;
}

export function registerGenerateComponent(server: McpServer) {
  server.registerTool(
    "generate_component",
    {
      description:
        "Figma のノードからコードと CSS を取得し、HTML + CSS Modules のコンポーネントを生成します",
      inputSchema: {
        figmaUrl: z
          .string()
          .describe(
            "Figma の URL（例: https://www.figma.com/file/<KEY>/...?node-id=<ID>）"
          ),
        componentName: z
          .string()
          .optional()
          .describe("コンポーネント名（省略時はノード名を使用）"),
      },
    },
    async ({ figmaUrl, componentName }) => {
      const u = new URL(figmaUrl);
      const fileKeyMatch = u.pathname.match(/\/(?:file|design)\/([^/]+)/);
      const nodeIdParam = u.searchParams.get("node-id");

      if (!fileKeyMatch || !nodeIdParam) {
        return {
          content: [
            {
              type: "text",
              text: `❌ URL から fileKey・nodeId を抽出できませんでした: ${figmaUrl}`,
            },
          ],
        };
      }

      const fileKey = fileKeyMatch[1];
      const normalizedNodeId = nodeIdParam.replace("-", ":");

      const node = await getNode(fileKey, normalizedNodeId);

      const name = componentName ?? (toKebabCase(node.name) || "component");
      const cssMap = new Map<string, string>();
      const usedNames = new Set<string>();

      const htmlBody = buildTree(node, cssMap, usedNames, 2);

      const cssContent = Array.from(cssMap.entries())
        .map(([cls, props]) => `.${cls} {\n  ${props};\n}`)
        .join("\n\n");

      const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="${name}.module.css" />
</head>
<body>
${htmlBody}
</body>
</html>`;

      const htmlPath = path.join(OUTPUT_DIR, `${name}.html`);
      const cssPath = path.join(OUTPUT_DIR, `${name}.module.css`);

      fs.writeFileSync(htmlPath, htmlContent, "utf-8");
      fs.writeFileSync(cssPath, cssContent, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `✅ コンポーネントを生成しました\n\nHTML: ${htmlPath}\nCSS:  ${cssPath}\nノード: ${node.name} (${node.type})\nクラス数: ${cssMap.size}`,
          },
        ],
      };
    }
  );
}
