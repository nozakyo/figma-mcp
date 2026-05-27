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
  server.tool(
    "get_figma_image",
    "Figma の指定ノードを画像ファイルとして保存する",
    {
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
    },
    async ({ fileKey, nodeId, format, scale }) => {
      const normalizedNodeId = nodeId.replace("-", ":");
      const imageUrl = await getNodeImageUrl(fileKey, normalizedNodeId, format, scale);

      const safeNodeId = normalizedNodeId.replace(":", "-");
      const fileName = `${fileKey}_${safeNodeId}.${format}`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(response.data));

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ 画像を保存しました`,
              ``,
              `**保存パス:** ${filePath}`,
              `**ノード ID:** ${normalizedNodeId}`,
              `**フォーマット:** ${format} (x${scale})`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
