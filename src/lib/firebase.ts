import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBJvludqZCq-NpUPwEUxZLABi574N0IdCw",
    authDomain: "share-buddy-db872.firebaseapp.com",
    projectId: "share-buddy-db872",
    storageBucket: "share-buddy-db872.firebasestorage.app",
    messagingSenderId: "179572948012",
    appId: "1:179572948012:web:392898ba03d89ac182e589",
    measurementId: "G-HHG8MM4C9X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
