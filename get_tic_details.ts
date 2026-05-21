import fetch from 'node-fetch'; // wait, node-fetch is not in package.json dependencies, but we have global fetch in Node 18+ (Vite/Node)
// We can use global fetch directly!

async function getDetails(ticId: string, period: number) {
    const baseUrl = 'http://localhost:3000';
    console.log(`\n=================== TIC ${ticId} ===================`);
    try {
        // 1. Get Light Curve
        const lcRes = await fetch(`${baseUrl}/api/light-curve/${ticId}`);
        const lc = await lcRes.json() as any;
        console.log("Light Curve Meta:", JSON.stringify(lc.metadata, null, 2));

        // 2. Get Statistics
        const statsRes = await fetch(`${baseUrl}/api/transit-stats/${ticId}`);
        const stats = await statsRes.json() as any;
        console.log("Transit Stats:", JSON.stringify(stats.statistics, null, 2));

        // 3. Get Python Period Verification
        const periodRes = await fetch(`${baseUrl}/api/verify-period`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticId, period })
        });
        const periodData = await periodRes.json();
        console.log("Period Verification:", JSON.stringify(periodData, null, 2));

        // 4. Get APIE Physical Profile
        const profileRes = await fetch(`${baseUrl}/api/physical-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticId, period })
        });
        const profile = await profileRes.json() as any;
        console.log("APIE Physical Profile:", JSON.stringify(profile, null, 2));

    } catch (e: any) {
        console.error("Error fetching details:", e.message);
    }
}

async function main() {
    // Check TIC 463402815 with period 5.0
    await getDetails('463402815', 5.0);
}

main().catch(console.error);
