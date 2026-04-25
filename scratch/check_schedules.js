const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBXjBBAnT-qIchTelWU6YWAvzXmkEgMBBw",
  authDomain: "kiemtranoibo-ccks.firebaseapp.com",
  projectId: "kiemtranoibo-ccks",
  storageBucket: "kiemtranoibo-ccks.appspot.com",
  messagingSenderId: "860631528951",
  appId: "1:860631528951:web:88b80d83f147a58d8b6af2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testQuery() {
  try {
    const q = query(collection(db, 'schedules'), limit(5));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testQuery();
