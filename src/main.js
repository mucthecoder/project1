import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase Config from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

//  Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Login
window.login = (event) => {
  if (event) event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // ⚠️ Save to localStorage for dev/demo
      localStorage.setItem("savedEmail", email);
      localStorage.setItem("savedPassword", password);

      alert("Login successful!");
      window.location.href = "/welcome.html";
    })
    .catch((err) => {
      alert("Login failed: " + err.message);
    });
};

// Signup
window.signup = () => {
  const firstName = document.getElementById("signup-first-name").value;
  const lastName = document.getElementById("signup-last-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      return setDoc(doc(db, "users", uid), {
        firstName,
        lastName,
        email,
        createdAt: serverTimestamp()
      });
    })
    .then(() => {
      alert("Signup successful!");
    })
    .catch((err) => {
      alert("Signup failed: " + err.message);
    });
};

//  Forgot Password
window.forgotPassword = () => {
  const email = document.getElementById("login-email").value;
  console.log("Trying to reset password for:", email); // Debug

  if (!email) {
    alert("Please enter your email to reset your password.");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("Password reset email sent.");
    })
    .catch((error) => {
      console.error("Password reset error:", error); // Debug
      alert("Error: " + error.message);
    });
};

// Google Sign In/Sign Up
window.googleSignIn = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // Always show account chooser
  signInWithPopup(auth, provider)
    .then(async (result) => {
      const user = result.user;
      // Check if user doc exists, if not, create it
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
        .then(({ getDoc }) => getDoc(userDocRef));
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          firstName: user.displayName ? user.displayName.split(" ")[0] : "",
          lastName: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "",
          email: user.email,
          createdAt: serverTimestamp()
        });
      }
      alert("Google sign-in successful!");
      window.location.href = "/welcome.html";
    })
    .catch((err) => {
      alert("Google sign-in failed: " + err.message);
    });
};

//  Auto-fill login form from localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("savedEmail");
  const savedPassword = localStorage.getItem("savedPassword");

  if (savedEmail) {
    document.getElementById("login-email").value = savedEmail;
  }
  if (savedPassword) {
    document.getElementById("login-password").value = savedPassword;
  }
});
