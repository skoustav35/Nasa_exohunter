async function test() {
    try {
        const res = await fetch("http://localhost:3000/api/health");
        const data = await res.json();
        console.log("Local Health:", data);
        
        const res2 = await fetch("http://localhost:3000/api/all-tics");
        const data2 = await res2.json();
        console.log("All TICs:", data2);
    } catch (e) {
        console.error("Local Test Failed:", e.message);
    }
}
test();
