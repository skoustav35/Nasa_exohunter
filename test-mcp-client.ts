import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  console.log("Starting MCP Client Test...");
  
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
  console.log("✅ Connected to MCP server");

  console.log("\n──────────────────────────────────────────");
  console.log("1. Fetching random TIC ID...");
  const randomRes = await client.callTool({ name: "get_random_tic_id", arguments: {} });
  const textContent = randomRes.content[0].text as string;
  console.log(textContent);
  
  const ticMatch = textContent.match(/TIC\s+(\d+)/);
  let ticId = ticMatch ? ticMatch[1] : null;

  if (!ticId || textContent.includes("Error")) {
    console.log("⚠️ Failed to fetch random TIC ID (ExoFOP might be down). Using fallback TIC ID: 261136679");
    ticId = "261136679";
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`2. Getting light curve for TIC ${ticId}...`);
  const lcRes = await client.callTool({ name: "get_light_curve", arguments: { ticId } });
  console.log(lcRes.content[0].text);

  console.log("\n──────────────────────────────────────────");
  console.log("3. Creating query stream card...");
  const queryRes = await client.callTool({ 
    name: "create_query_card", 
    arguments: { ticId, status: "AI IDE MCP Testing...", researcherName: "Antigravity AI IDE" } 
  });
  console.log(queryRes.content[0].text);

  console.log("\n──────────────────────────────────────────");
  console.log(`4. Running full analysis pipeline for TIC ${ticId}...`);
  const analyzeRes = await client.callTool({ name: "analyze_transit", arguments: { ticId } });
  const analyzeText = analyzeRes.content[0].text as string;
  console.log(analyzeText);

  if (analyzeText.includes("NEW DISCOVERY")) {
    console.log("\n──────────────────────────────────────────");
    console.log("5. 🎉 New Discovery found! Creating thesis...");
    const thesisRes = await client.callTool({
      name: "create_discovery_thesis",
      arguments: {
        ticId,
        thesis: `### Discovery Thesis for TIC ${ticId}\n\nAutomated discovery validated via MCP tools.\n\n*This thesis was generated during live MCP integration testing.*`,
        researcherName: "Antigravity AI IDE"
      }
    });
    console.log(thesisRes.content[0].text);
  } else {
    console.log("\n──────────────────────────────────────────");
    console.log("No new discovery on this run. That's science!");
  }

  console.log("\n──────────────────────────────────────────");
  console.log("6. Checking Server Health...");
  const healthRes = await client.callTool({ name: "get_server_health", arguments: {} });
  console.log(healthRes.content[0].text);

  console.log("\n✅ Test complete. Exiting...");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
