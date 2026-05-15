import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migrate reports (.tex files) to Firestore `reports` collection.
 * Each document is keyed by filename and stores the full LaTeX content.
 */
async function migrateReports() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 MIGRATING REPORTS → Firestore');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(dir)) {
    console.log('⚠️  No reports folder found. Skipping.');
    return 0;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tex'));
  console.log(`Found ${files.length} report file(s).\n`);

  let uploaded = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const ticMatch = file.match(/TIC_(\d+)/);
      const ticId = ticMatch ? ticMatch[1] : 'unknown';

      await setDoc(doc(db, 'reports', file), {
        ticId,
        filename: file,
        content,
        type: 'methodology',
        createdAt: new Date().toISOString()
      });

      uploaded++;
      console.log(`  ✅ [${uploaded}/${files.length}] ${file}`);
    } catch (err: any) {
      console.error(`  ❌ Failed: ${file} — ${err.message}`);
    }
  }

  console.log(`\n📄 Reports: ${uploaded}/${files.length} uploaded successfully.\n`);
  return uploaded;
}

/**
 * Migrate plots (PNG images) to Firestore `plots` collection as Base64 data URIs.
 * Each document stores the full image data inline — no Firebase Storage needed.
 */
async function migratePlots() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🖼️  MIGRATING PLOTS → Firestore (Base64)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dir = path.join(process.cwd(), 'plots');
  if (!fs.existsSync(dir)) {
    console.log('⚠️  No plots folder found. Skipping.');
    return 0;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} plot file(s).\n`);

  let uploaded = 0;
  for (const file of files) {
    try {
      const ticMatch = file.match(/TIC_(\d+)/);
      const ticId = ticMatch ? ticMatch[1] : 'unknown';

      const filePath = path.join(dir, file);
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const sizeKB = (fileBuffer.length / 1024).toFixed(1);
      const base64SizeKB = (base64Data.length / 1024).toFixed(1);

      // Determine plot type
      let plotType = 'unknown';
      if (file.includes('phase_folded')) plotType = 'phase_folded';
      else if (file.includes('ttv_oc')) plotType = 'ttv_oc';

      await setDoc(doc(db, 'plots', file), {
        ticId,
        filename: file,
        type: plotType,
        base64: base64Data,
        mimeType: 'image/png',
        sizeBytes: fileBuffer.length,
        createdAt: new Date().toISOString()
      });

      uploaded++;
      console.log(`  ✅ [${uploaded}/${files.length}] ${file} (${sizeKB}KB → ${base64SizeKB}KB base64)`);
    } catch (err: any) {
      console.error(`  ❌ Failed: ${file} — ${err.message}`);
    }
  }

  console.log(`\n🖼️  Plots: ${uploaded}/${files.length} uploaded successfully.\n`);
  return uploaded;
}

/**
 * Main migration runner
 */
async function run() {
  console.log('\n🚀 SARKAR EXOHUNTER — FIREBASE MIGRATION\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Project: ${firebaseConfig.projectId}\n`);

  try {
    const reportCount = await migrateReports();
    const plotCount = await migratePlots();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  📄 Reports: ${reportCount}`);
    console.log(`  🖼️  Plots:   ${plotCount}`);
    console.log(`  📦 Total:   ${reportCount + plotCount} documents\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err);
    process.exit(1);
  }
}

run();
