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
      description: "Figma のノードから画像を取得して保存します",
      inputSchema: {
        fileKey: z.string().describe("Figma ファイルキー（URL の /file/<KEY>/）"),
        nodeId: z
          .string()
          .describe("ノード ID（URL の ?node-id=<ID> または Figma の右クリック→Copy Link）"),
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
    async ({ fileKey, nodeId, format, scale }) => {
      const normalizedNodeId = nodeId.replace("-", ":");
      const safeNodeId = normalizedNodeId.replace(":", "-");
      const fileName = `${fileKey}_${safeNodeId}.${format}`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      if (process.env.FIGMA_MOCK === "true") {
        // 1x1 透明PNG のプレースホルダー
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
