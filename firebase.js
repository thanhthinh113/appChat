import firebase from "firebase/compat/app";

import "firebase/compat/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDpyaGyzYDmgJCe6oG1D9e3a28qXPBqw_0",
  authDomain: "verify-otp-7b635.firebaseapp.com",
  projectId: "verify-otp-7b635",
  storageBucket: "verify-otp-7b635.firebasestorage.app",
  messagingSenderId: "410141581774",
  appId: "1:410141581774:web:3ca4fd929587386d3d8b9f",
  measurementId: "G-Z0XE21CP6M",
};

firebase.initializeApp(firebaseConfig);

// 👇 Thêm đoạn này khi đang test trên thiết bị/emulator
if (__DEV__) {
  firebase.auth().settings.appVerificationDisabledForTesting = true;
}

export default firebase;
