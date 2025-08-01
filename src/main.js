import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Config from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Cart Management Functions
let currentCart = [];

// Initialize cart sync on auth state change
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User signed in - load cart from Firestore
    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists() && docSnap.data().cart) {
        currentCart = docSnap.data().cart;
        updateLocalCart(currentCart);
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  } else {
    // User signed out - clear cart
    currentCart = [];
    updateLocalCart(currentCart);
  }
});

// Update both Firestore and local cart
async function updateCart(newCart) {
  currentCart = newCart;
  updateLocalCart(currentCart);
  
  const user = auth.currentUser;
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { cart: currentCart }, { merge: true });
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  }
}

// Update local storage and UI
function updateLocalCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  if (typeof updateCartDisplay === "function") {
    updateCartDisplay(cart);
  }
}

// Add item to cart
window.addToCart = async function(productId, productData) {
  const existingItem = currentCart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    currentCart.push({
      id: productId,
      ...productData,
      quantity: 1
    });
  }
  
  await updateCart(currentCart);
  showAddToCartConfirmation(productData.name);
};

// Remove item from cart
window.removeFromCart = async function(productId) {
  currentCart = currentCart.filter(item => item.id !== productId);
  await updateCart(currentCart);
};

// Update item quantity
window.updateCartItemQuantity = async function(productId, change) {
  const item = currentCart.find(item => item.id === productId);
  
  if (item) {
    item.quantity += change;
    
    if (item.quantity <= 0) {
      currentCart = currentCart.filter(item => item.id !== productId);
    }
    
    await updateCart(currentCart);
  }
};

// User Authentication Functions

// Email/Password Login
window.login = async (event) => {
  if (event) event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem("savedEmail", email);
    localStorage.setItem("savedPassword", password);
    alert("Login successful!");
    window.location.href = "/home.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
};

// Email/Password Signup
window.signup = async () => {
  const firstName = document.getElementById("signup-first-name").value;
  const lastName = document.getElementById("signup-last-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    await setDoc(doc(db, "users", uid), {
      firstName,
      lastName,
      email,
      createdAt: serverTimestamp(),
      cart: [] // Initialize empty cart
    });
    
    alert("Signup successful!");
    window.location.href = "/home.html";
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
};

// Password Reset
window.forgotPassword = async () => {
  const email = document.getElementById("login-email").value;

  if (!email) {
    alert("Please enter your email to reset your password.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent. Please check your inbox.");
  } catch (error) {
    alert("Error: " + error.message);
  }
};

// Google Sign In
window.googleSignIn = async () => {
  const googleButtons = document.querySelectorAll('.google-signin');
  googleButtons.forEach(btn => btn.disabled = true);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        firstName: user.displayName?.split(" ")[0] || "",
        lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
        email: user.email,
        createdAt: serverTimestamp(),
        cart: [] // Initialize empty cart
      });
    }
    
    alert("Google sign-in successful!");
    window.location.href = "/home.html";
  } catch (err) {
    if (err.code !== "auth/cancelled-popup-request" && 
        err.code !== "auth/popup-closed-by-user") {
      alert("Google sign-in failed: " + err.message);
    }
  } finally {
    googleButtons.forEach(btn => btn.disabled = false);
  }
};

// Auto-fill login form from localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("savedEmail");
  const savedPassword = localStorage.getItem("savedPassword");

  if (savedEmail) {
    document.getElementById("login-email").value = savedEmail;
  }
  if (savedPassword) {
    document.getElementById("login-password").value = savedPassword;
  }

  // Initialize cart from local storage if not logged in
  if (!auth.currentUser) {
    const localCart = localStorage.getItem("cart");
    if (localCart) {
      currentCart = JSON.parse(localCart);
      updateLocalCart(currentCart);
    }
  }
});