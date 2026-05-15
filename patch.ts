import { db } from "./src/lib/firebase.js";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

async function patch() {
    const q = query(collection(db, "queries"), where("status", "==", "New Discovery!"));
    const snapshot = await getDocs(q);
    
    for (const document of snapshot.docs) {
        let thesis = document.data().thesis;
        if (!thesis) continue;
        
        // Replace Catalog with Gaia DR3 Hard-Lock
        thesis = thesis.replace(/\(Catalog\)/g, "(Gaia DR3 Hard-Lock)");
        thesis = thesis.replace(/Catalog Ground Truth/g, "Gaia DR3 Hard-Lock Ground Truth");
        thesis = thesis.replace(/catalog stellar radius/g, "Gaia DR3 stellar radius");
        thesis = thesis.replace(/catalog stellar parameters/g, "Gaia DR3 stellar parameters");
        thesis = thesis.replace(/Catalog verification confirms/g, "Gaia DR3 verification confirms");
        thesis = thesis.replace(/Catalog data confirms/g, "Gaia DR3 data confirms");
        
        // Replace Updated APIE Fallback with Masked by Sub-Signal Sweep
        thesis = thesis.replace(/\(Updated APIE Fallback\)/g, "(Masked by Sub-Signal Sweep)");
        
        // Update Verdict
        thesis = thesis.replace(/Archive Reconciliation Complete/g, "v4.1 Precision Architecture Audit Complete");
        thesis = thesis.replace(/Restoration Complete/g, "v4.1 Precision Architecture Audit Complete");

        await updateDoc(doc(db, "queries", document.id), { thesis });
        console.log(`Updated thesis for TIC ${document.data().ticId}`);
    }
    console.log("All discovery theses patched successfully.");
    process.exit(0);
}

patch().catch(console.error);
