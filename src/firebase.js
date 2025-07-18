import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAnKQVAgQQaeujXq2z2yQWoqLMVqneYE30",
  authDomain: "dartsdoublestrainer.firebaseapp.com",
  projectId: "dartsdoublestrainer",
  storageBucket: "dartsdoublestrainer.firebasestorage.app",
  messagingSenderId: "471422765052",
  appId: "1:471422765052:web:df629d251b0a1a6e0b1479",
  measurementId: "G-VG9GZKE97H"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
