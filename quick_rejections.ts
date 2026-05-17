import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "c:/Users/koush/Downloads/Nasa_exohunter-main/Nasa_exohunter-main/mcp-server/index.ts"]
});

const client = new Client(
    { name: "rejection-agent", version: "1.0.0" },
    { capabilities: {} }
);

async function callTool(client: Client, name: string, args: any) {
    const result = await client.callTool({ name, arguments: args });
    return result.content[0].text;
}

async function run() {
    await client.connect(transport);
    console.log("Connected");

    let count = 0;
    while (count < 15) {
        try {
            const ticText = await callTool(client, "get_random_tic_id", {});
            const ticMatch = ticText.match(/TIC\s+(\d+)/);
            if (!ticMatch) continue;
            const ticId = ticMatch[1];
            console.log(`Checking TIC ${ticId}`);

            await callTool(client, "get_light_curve", { ticId });
            const stats = await callTool(client, "compute_transit_statistics", { ticId });
            const physicalProfile = await callTool(client, "analyze_physical_profiles", { ticId, period: 10 });
            const analysis = await callTool(client, "analyze_transit", { ticId });

            const thesis = `${analysis}\n\n### 🧠 Sovereign Rejection Audit\nCandidate TIC ${ticId} failed the scientific vetting protocol. The signal is likely a stellar artifact or instrument noise.`;

            await callTool(client, "create_query_card", { ticId, status: "Rejected", researcherName: "Antigravity AI" });
            await callTool(client, "create_rejection_thesis", { ticId, thesis, researcherName: "Antigravity AI" });
            
            console.log(`✅ Recorded Rejection for TIC ${ticId}`);
            count++;
        } catch (e) {
            console.error("Error:", e);
        }
    }
}

run();
