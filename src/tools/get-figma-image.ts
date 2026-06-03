import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getNodeImageUrl } from "../figma-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../../output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export function registerGetFigmaImage(server: McpServer) {
  server.registerTool(
    "get_figma_image",
    {
      description: "Figma の URL から画像を取得して保存します",
      inputSchema: {
        figmaUrl: z.string().describe("Figma の URL（例: https://www.figma.com/file/<KEY>/...?node-id=<ID>）"),
        format: z
          .enum(["png", "svg", "jpg"])
          .default("png")
          .describe("画像フォーマット"),
        scale: z
          .number()
          .min(0.5)
          .max(4)
          .default(2)
          .describe("スケール倍率（1〜4, Retina は 2）"),
      }
    },
    async ({ figmaUrl, format, scale }) => {
      const u = new URL(figmaUrl);
      const fileKeyMatch = u.pathname.match(/\/(?:file|design)\/([^/]+)/);
      const nodeIdParam = u.searchParams.get("node-id");

      if (!fileKeyMatch || !nodeIdParam) {
        return {
          content: [{ type: "text", text: `❌ URL から fileKey・nodeId を抽出できませんでした: ${figmaUrl}` }],
        };
      }

      const fileKey = fileKeyMatch[1];
      const normalizedNodeId = nodeIdParam.replace("-", ":");
      const safeNodeId = normalizedNodeId.replace(":", "-");
      const fileName = `${fileKey}_${safeNodeId}.${format}`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      if (process.env.FIGMA_MOCK === "true") {
        const placeholder = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        );
        fs.writeFileSync(filePath, placeholder);
      } else {
        const imageUrl = await getNodeImageUrl(fileKey, normalizedNodeId, format, scale);
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(filePath, Buffer.from(response.data));
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ 画像を保存しました\n\n保存パス: ${filePath}\nノード ID: ${normalizedNodeId}\nフォーマット: ${format} (x${scale})`,
          },
        ],
      };
    }
  );
}
