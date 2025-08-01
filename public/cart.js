import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Initialize Firebase (assuming app is already initialized in main.js)
const auth = getAuth();
const db = getFirestore();

// Product database - should match what's in your home.html
const products = [
  {
    id: 1,
    name: "Panado Tablets 1000mg 24s",
    price: 49.99,
    image: "Products/Panado_Tablets_1000mg_24s-removebg-preview.png",
    description: "Fast-acting pain relief for headaches, fever, and mild arthritis pain."
  },
  {
    id: 2,
    name: "Disprin Tablets 300mg 24s",
    price: 39.99,
    image: "Products/Disprin_Tablets_300mg_24s-removebg-preview.png",
    description: "Effervescent pain reliever that works quickly to reduce pain and inflammation."
  },
  {
    id: 3,
    name: "Vitamin C 1000mg 60 Tablets",
    price: 129.99,
    image: "Products/Very_Well_Vitamin_C_1000mg_60_Tablets-removebg-preview.png",
    description: "Boosts immune system and promotes healthy skin with high-potency Vitamin C."
  },
  {
    id: 4,
    name: "Pampers Baby Dry Size 3 60s",
    price: 249.99,
    image: "Products/Pampers_Baby_Dry_Size_3_98-removebg-preview.png",
    description: "Premium diapers with 12-hour leak protection and wetness indicator."
  }
];

// Initialize cart
let cart = [];

// DOM elements
const cartIcon = document.getElementById('cartIcon');
const cartDropdown = document.getElementById('cartDropdown');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.querySelector('.cart-count');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const confirmation = document.getElementById('confirmation');

// Load user's cart from Firestore
async function loadUserCart() {
  const user = auth.currentUser;
  if (!user) {
    cart = [];
    updateCartDisplay();
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().cart) {
      cart = userDoc.data().cart;
    } else {
      cart = [];
    }
    
    updateCartDisplay();
  } catch (error) {
    console.error("Error loading user cart:", error);
    cart = [];
    updateCartDisplay();
  }
}

// Save cart to Firestore
async function saveCartToFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      cart: cart
    });
  } catch (error) {
    console.error("Error saving cart:", error);
  }
}

// Add product to cart
async function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }
  
  await saveCartToFirestore();
  updateCartDisplay();
  showAddToCartConfirmation(product.name);
}

// Update item quantity
async function updateQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
  
  if (item) {
    item.quantity += change;
    
    if (item.quantity <= 0) {
      cart = cart.filter(item => item.id !== productId);
    }
    
    await saveCartToFirestore();
    updateCartDisplay();
  }
}

// Remove item from cart
async function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  await saveCartToFirestore();
  updateCartDisplay();
}

// Update cart display
function updateCartDisplay() {
  // Update cart count
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  
  // Update cart items display
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
      </div>
    `;
    cartTotalPrice.textContent = 'R0.00';
  } else {
    cartItemsContainer.innerHTML = '';
    let totalPrice = 0;
    
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalPrice += itemTotal;
      
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">R${item.price.toFixed(2)}</div>
          <div class="cart-item-quantity">
            <button class="quantity-btn minus" data-id="${item.id}">-</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn plus" data-id="${item.id}">+</button>
            <button class="remove-item" data-id="${item.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      cartItemsContainer.appendChild(cartItem);
    });
    
    cartTotalPrice.textContent = `R${totalPrice.toFixed(2)}`;
    
    // Add event listeners to quantity buttons
    document.querySelectorAll('.quantity-btn.minus').forEach(button => {
      button.addEventListener('click', () => {
        const id = parseInt(button.dataset.id);
        updateQuantity(id, -1);
      });
    });
    
    document.querySelectorAll('.quantity-btn.plus').forEach(button => {
      button.addEventListener('click', () => {
        const id = parseInt(button.dataset.id);
        updateQuantity(id, 1);
      });
    });
    
    document.querySelectorAll('.remove-item').forEach(button => {
      button.addEventListener('click', () => {
        const id = parseInt(button.dataset.id);
        removeFromCart(id);
      });
    });
  }
}

// Show add to cart confirmation
function showAddToCartConfirmation(productName) {
  confirmation.textContent = `${productName} added to cart!`;
  confirmation.style.display = 'block';
  
  setTimeout(() => {
    confirmation.style.display = 'none';
  }, 3000);
}

// Toggle cart dropdown
function toggleCartDropdown(e) {
  e.stopPropagation();
  if (cartDropdown.style.display === 'block') {
    cartDropdown.style.display = 'none';
  } else {
    cartDropdown.style.display = 'block';
  }
}

// Initialize cart functionality
export function initCart() {
  // Set up event listeners
  cartIcon.addEventListener('click', toggleCartDropdown);
  
  document.addEventListener('click', function(e) {
    if (!cartIcon.contains(e.target) && !cartDropdown.contains(e.target)) {
      cartDropdown.style.display = 'none';
    }
  });
  
  // Load cart when auth state changes
  auth.onAuthStateChanged(() => {
    loadUserCart();
  });
  
  // Add to cart event delegation
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart') || 
        (e.target.closest('.add-to-cart'))) {
      const button = e.target.classList.contains('add-to-cart') ? 
        e.target : e.target.closest('.add-to-cart');
      const productId = parseInt(button.dataset.id);
      addToCart(productId);
    }
  });
}