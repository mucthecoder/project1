// Firebase setup
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


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------- AUTH -------------------------

// Login
window.login = (e) => {
  if (e) e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      localStorage.setItem("savedEmail", email);
      localStorage.setItem("savedPassword", password);
      alert("Login successful!");
      window.location.href = "/home.html";
    })
    .catch((err) => alert("Login failed: " + err.message));
};

// Signup
window.signup = () => {
  const firstName = document.getElementById("signup-first-name").value;
  const lastName = document.getElementById("signup-last-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((cred) => {
      const uid = cred.user.uid;
      return setDoc(doc(db, "users", uid), {
        firstName,
        lastName,
        email,
        cart: [],
        createdAt: serverTimestamp()
      });
    })
    .then(() => alert("Signup successful!"))
    .catch((err) => alert("Signup failed: " + err.message));
};

// Password reset
window.forgotPassword = () => {
  const email = document.getElementById("login-email").value;
  if (!email) return alert("Please enter your email to reset password.");

  sendPasswordResetEmail(auth, email)
    .then(() => alert("Password reset email sent."))
    .catch((err) => alert("Error: " + err.message));
};

// Google Sign-In
window.googleSignIn = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  signInWithPopup(auth, provider)
    .then(async (result) => {
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          email: user.email,
          cart: [],
          createdAt: serverTimestamp()
        });
      }

      alert("Google sign-in successful!");
      window.location.href = "home.html";
    })
    .catch((err) => alert("Google sign-in failed: " + err.message));
};

// ---------------- CART FUNCTIONS ------------------

// Add item to user Firestore cart
window.addToUserCart = async (product, quantity = 1) => {
  const user = auth.currentUser;
  if (!user) return alert("Please log in first.");

  const userRef = doc(db, "users", user.uid);
  const updatedProduct = { ...product, quantity };
  await updateDoc(userRef, {
    cart: arrayUnion(updatedProduct)
  });

  alert("Added to cart!");
  loadUserCart(); // Refresh cart
};

// Remove item from Firestore cart
window.removeFromUserCart = async (product) => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    cart: arrayRemove(product)
  });

  loadUserCart(); // Refresh cart
};

// Load and render user cart on page
async function loadUserCart() {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const cart = userSnap.exists() && userSnap.data().cart ? userSnap.data().cart : [];

  const cartItemsContainer = document.getElementById("cartItems");
  const cartTotalPrice = document.getElementById("cartTotalPrice");

  if (!cartItemsContainer || !cartTotalPrice) return;

  cartItemsContainer.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = "cart-item";

    itemElement.innerHTML = `
      <img src="${item.image || '#'}" alt="${item.title}" />
      <div class="cart-item-info">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-price">R${item.price.toFixed(2)}</div>
        <div class="cart-item-quantity">
          Quantity: <span class="quantity-value">${item.quantity}</span>
        </div>
      </div>
      <button class="remove-item" onclick='removeFromUserCart(${JSON.stringify(item).replace(/"/g, '&quot;')})'>
        &times;
      </button>
    `;

    total += item.price * item.quantity;
    cartItemsContainer.appendChild(itemElement);
  });

  cartTotalPrice.textContent = `R${total.toFixed(2)}`;

  // Update cart count badge
  const cartCount = document.querySelector(".cart-count");
  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

// ----------------- UTILS -------------------------

// Autofill login form from localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("savedEmail");
  const savedPassword = localStorage.getItem("savedPassword");

  if (savedEmail) document.getElementById("login-email").value = savedEmail;
  if (savedPassword) document.getElementById("login-password").value = savedPassword;
});

// Load cart if user is logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserCart();
  }
});
