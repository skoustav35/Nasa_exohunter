async function check() {
    try {
        const res = await fetch("http://localhost:3000/api/discoveries");
        const data = await res.json();
        console.log("Recent Discoveries:", data.discoveries.map(d => d.ticId));
    } catch (e) {
        console.error("Check Failed:", e.message);
    }
}
check();
