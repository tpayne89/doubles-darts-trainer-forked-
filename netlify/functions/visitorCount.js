import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let db;

if (!app) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  db = getFirestore();
}

export async function handler(event, context) {
  const docRef = db.collection('stats').doc('visitorCount');
  const doc = await docRef.get();

  let count = 1;
  if (doc.exists) {
    count = doc.data().value + 1;
  }

  await docRef.set({ value: count });

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ value: count }),
  };
}
