import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  console.log("🚀 Starting MCP Client Test 2...");
  
  // This acts exactly like an AI IDE's MCP Configuration
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./mcp-server/dist/index.js"],
    env: {
      ...process.env,
      EXOHUNTER_API_URL: "http://localhost:3000"
    }
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Connected to Sarkar ExoHunter MCP server via stdio!");

  console.log("\n──────────────────────────────────────────");
  console.log("TEST 1: Get a random TIC ID and its light curve");
  
  const randomRes = await client.callTool({ name: "get_random_tic_id", arguments: {} });
  const randomText = randomRes.content[0].text as string;
  console.log("-> Tool 'get_random_tic_id' returned:");
  console.log(randomText);
  
  const ticMatch = randomText.match(/TIC\s+(\d+)/);
  const randomTicId = ticMatch ? ticMatch[1] : null;

  if (randomTicId) {
    console.log(`\n-> Now fetching light curve for this random TIC ID: ${randomTicId}...`);
    const lcRes1 = await client.callTool({ name: "get_light_curve", arguments: { ticId: randomTicId } });
    console.log("-> Tool 'get_light_curve' returned:");
    console.log(lcRes1.content[0].text);
  } else {
    console.log("❌ Failed to extract random TIC ID.");
  }

  console.log("\n──────────────────────────────────────────");
  console.log("TEST 2: Get a light curve for a SPECIFIC TIC ID (e.g. 261136679)");
  
  const specificTicId = "261136679";
  const lcRes2 = await client.callTool({ name: "get_light_curve", arguments: { ticId: specificTicId } });
  console.log("-> Tool 'get_light_curve' returned:");
  console.log(lcRes2.content[0].text);

  console.log("\n✅ Test complete. Exiting...");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
