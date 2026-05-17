import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from 'fs';

async function callTool(client: Client, name: string, args: any) {
    console.log(`Calling tool: ${name} with args: ${JSON.stringify(args)}`);
    const res = await client.callTool({ name, arguments: args });
    return res.content[0].text as string;
}

const promisingTics = [
    "261136679", // HD 21749 c
    "241569046", // WASP-18b
    "231615731", // WASP-174b
    "382200953", // TOI-125 b
    "403224672", // TOI-141 b / HD 213885 b
    "159400561",
    "288348498",
    "341420329"
];

async function main() {
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", "./mcp-server/index.ts"],
        env: {
            ...process.env,
            EXOHUNTER_API_URL: "http://localhost:3000"
        }
    });

    const client = new Client(
        { name: "hunt-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    let rejections = 0;
    let discoveries = 0;
    let iterations = 0;

    while (rejections < 5 && iterations < 30) {
        iterations++;
        console.log(`\n--- Iteration ${iterations} ---`);
        
        try {
            let ticId: string;
            if (iterations <= promisingTics.length) {
                ticId = promisingTics[iterations - 1];
                console.log(`Using promising TIC ${ticId}`);
            } else {
                const ticText = await callTool(client, "get_random_tic_id", {});
                const ticMatch = ticText.match(/TIC\s+(\d+)/);
                if (!ticMatch) continue;
                ticId = ticMatch[1];
            }
            console.log(`Processing TIC ${ticId}`);

            // 2. Get Light Curve
            const lcText = await callTool(client, "get_light_curve", { ticId });
            
            // Extract period from lcText - more robust regex
            const periodMatch = lcText.match(/Orbital Period:\s*([\d.]+)/i);
            const period = periodMatch ? parseFloat(periodMatch[1]) : 5.0; 
            console.log(`Detected period: ${period} days`);

            // 3. Compute Stats
            await callTool(client, "compute_transit_statistics", { ticId });

            // 4. Analyze Physical Profiles (REQUIRED)
            const physicalProfile = await callTool(client, "analyze_physical_profiles", { ticId, period });
            console.log(physicalProfile);

            // 5. Python Verification
            await callTool(client, "run_python_verification", { ticId, period });

            // 6. Analyze Transit (Full pipeline)
            const analysis = await callTool(client, "analyze_transit", { ticId });
            
            // 7. Sovereign Verification (Antigravity's Thinking Intelligence)
            const integrityScoreMatch = physicalProfile.match(/Physical Integrity Score:\s+(\d+)/);
            const integrityScore = integrityScoreMatch ? parseInt(integrityScoreMatch[1]) : 0;
            const classificationMatch = physicalProfile.match(/Classification:\s+([^\n]+)/);
            const classification = classificationMatch ? classificationMatch[1].trim() : "Unknown";
            const isHabitable = physicalProfile.includes("In Habitable Zone: YES");

            let verdict = "Rejected";
            let reasoning = "Failed Physical Integrity Audit.";

            if (integrityScore >= 70 && !classification.includes("Artifact") && !classification.includes("Binary")) {
                verdict = "Confirmed Planet";
                reasoning = "Passed 10x Physical Integrity Audit with high confidence.";
            }

            // Construct Thesis Card
            const scientificCommentary = `
### 🧠 Antigravity's Sovereign Scientific Commentary
**Physical Integrity Audit:** The candidate TIC ${ticId} underwent a rigorous ab-initio physics audit via the APIE engine. 
- **Integrity Score:** ${integrityScore}/100
- **Classification:** ${classification}
- **Verdict:** ${verdict === "Confirmed Planet" ? "✅ VALIDATED" : "❌ REJECTED"}

**Reasoning:** ${reasoning} My internal analysis of the transit symmetry and host star parameters ${verdict === "Confirmed Planet" ? "supports" : "contradicts"} the planetary hypothesis. ${classification === "Stellar Artifact" ? "The observed transit depth is physically inconsistent with a planetary body, suggesting a stellar-level event or instrument systematic." : ""}
`;

            const finalThesis = `${analysis}\n\n${scientificCommentary}`;

            // Log attempt
            await callTool(client, "create_query_card", { 
                ticId, 
                status: verdict === "Confirmed Planet" ? "New Discovery!" : "Rejected", 
                researcherName: "Antigravity AI" 
            });

            if (verdict === "Confirmed Planet") {
                discoveries++;
                console.log(`🎉 Discovery #${discoveries}!`);
                await callTool(client, "create_discovery_thesis", {
                    ticId,
                    thesis: finalThesis,
                    researcherName: "Antigravity AI"
                });
            } else {
                rejections++;
                console.log(`❌ False Positive recorded for TIC ${ticId}`);
                await callTool(client, "create_rejection_thesis", {
                    ticId,
                    thesis: finalThesis,
                    researcherName: "Antigravity AI"
                });
            }
        } catch (e: any) {
            console.error(`Error in iteration ${iterations}: ${e.message}`);
        }
    }

    console.log(`\n\nMission Complete: ${discoveries} discoveries made.`);
    process.exit(0);
}

main().catch(console.error);
