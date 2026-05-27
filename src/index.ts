import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import { registerGetFigmaImage } from "./tools/get-figma-image.js";

dotenv.config();

const server = new McpServer({ name: "figma-mcp", version: "1.0.0" });

registerGetFigmaImage(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Figma MCP サーバーが起動しました");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
