async function analyze(ticId, period) {
    try {
        console.log(`Analyzing TIC ${ticId}...`);
        const res = await fetch(`http://localhost:3000/api/analyze-transit?ticId=${ticId}`);
        const data = await res.json();
        console.log("Analysis Result:", data);
        
        const res2 = await fetch(`http://localhost:3000/api/analyze-physical-profiles?ticId=${ticId}&period=${period}`);
        const data2 = await res2.json();
        console.log("Physical Profile:", data2);
        
        // If it looks good, create a thesis
        const thesis = `🔬 Detailed Scientific Thesis for TIC ${ticId}\n\n${JSON.stringify(data2, null, 2)}`;
        const res3 = await fetch(`http://localhost:3000/api/discovery-thesis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ticId,
                thesis,
                researcherName: "Antigravity AI (Local Engine)"
            })
        });
        console.log("Thesis Created:", await res3.json());
    } catch (e) {
        console.error("Analysis Failed:", e.message);
    }
}
analyze("382200953", 4.65);
