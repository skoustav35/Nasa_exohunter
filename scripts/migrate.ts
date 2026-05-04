import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function migrateFolder(folderName: string, collectionName: string, extension: string) {
  console.log(`--- Migrating ${folderName} ---`);
  const dir = path.join(process.cwd(), folderName);
  if (!fs.existsSync(dir)) {
    console.log(`No ${folderName} folder found.`);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(extension));
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    await setDoc(doc(db, collectionName, file), {
      filename: file,
      content,
      createdAt: new Date().toISOString()
    });
    console.log(`Uploaded to ${collectionName}: ${file}`);
  }
}

async function migratePlots() {
  console.log('\n--- Migrating Plots (Storage) ---');
  const plotsDir = path.join(process.cwd(), 'plots');
  if (!fs.existsSync(plotsDir)) {
    console.log('No plots folder found.');
    return;
  }

  const files = fs.readdirSync(plotsDir).filter(f => f.endsWith('.png'));
  for (const file of files) {
    try {
      const ticId = file.match(/TIC_(\d+)/)?.[1] || 'unknown';
      const filePath = path.join(plotsDir, file);
      const fileBuffer = fs.readFileSync(filePath);

      const storageRef = ref(storage, `plots/${file}`);
      await uploadBytes(storageRef, fileBuffer);
      const downloadURL = await getDownloadURL(storageRef);

      await setDoc(doc(db, 'plots', file), {
        ticId,
        filename: file,
        url: downloadURL,
        type: file.includes('phase_folded') ? 'phase_folded' : 'ttv_oc',
        createdAt: new Date().toISOString()
      });
      console.log(`Uploaded plot: ${file} -> ${downloadURL}`);
    } catch (err: any) {
      console.warn(`Failed to upload plot ${file} to Storage: ${err.message}. Recording local reference only.`);
      await setDoc(doc(db, 'plots', file), {
        filename: file,
        status: 'local_only',
        createdAt: new Date().toISOString()
      });
    }
  }
}

async function run() {
  try {
    await migrateFolder('reports', 'reports', '.tex');
    await migrateFolder('tests', 'tests', '.py');
    await migratePlots();
    console.log('\nMigration process completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
