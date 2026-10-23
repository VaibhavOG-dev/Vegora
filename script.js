
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// PRODUCTS — real listings will be added by sellers
const products = [];
let selectedCategory = "All";
let cart = [];
let currentUser = null;
let authMode = "signup";

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const emptyMessage = document.getElementById("emptyMessage");
const sellModal = document.getElementById("sellModal");
const cartModal = document.getElementById("cartModal");
const authModal = document.getElementById("authModal");

const authForm = document.getElementById("authForm");
const authBtn = document.getElementById("authBtn");
const userStatus = document.getElementById("userStatus");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");
const authSwitch = document.getElementById("authSwitch");
const nameField = document.getElementById("nameField");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatPrice(price) {
  return "₹" + Number(price).toLocaleString("en-IN");
}

// DISPLAY PRODUCTS

function renderProducts() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  let filtered = products.filter(product => {
    const matchesCategory = selectedCategory === "All" ||
      product.category === selectedCategory;

    const searchable = [
      product.name, product.category, product.seller, product.description
    ].join(" ").toLowerCase();

    return matchesCategory && searchable.includes(searchTerm);
  });

  if (sortSelect.value === "low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortSelect.value === "high") {
    filtered.sort((a, b) => b.price - a.price);
  }

  productGrid.innerHTML = filtered.map(product => {
    const isOwner = currentUser &&
      product.sellerId === currentUser.uid;
    const inStock = product.inStock !== false;

    return `
      <article class="product-card">
        <div class="product-image">
          <img src="${escapeHTML(product.image)}"
            alt="${escapeHTML(product.name)}" loading="lazy"
            onerror="this.style.display='none'">
          <span class="product-tag">${escapeHTML(product.category)}</span>
        </div>

        <div class="product-info">
          <span class="product-category">HOMEGROWN GOODNESS</span>
          <h3>${escapeHTML(product.name)}</h3>
          <p class="product-description">${escapeHTML(product.description)}</p>
          <p class="product-seller">🌿 ${escapeHTML(product.seller)}</p>

          <p class="stock-status">
            ${inStock ? "✅ In Stock" : "❌ Out of Stock"}
          </p>

          <div class="product-bottom">
            <div class="product-price">
              ${formatPrice(product.price)}
              <small>/ ${escapeHTML(product.unit)}</small>
            </div>

            <button class="add-btn"
              data-add="${product.id}"
              ${inStock ? "" : "disabled"}>
              ${inStock ? "+ Basket" : "Unavailable"}
            </button>
          </div>

          ${isOwner ? `
            <div class="seller-controls">
              <button class="stock-btn"
                data-stock="${product.id}">
                ${inStock ? "Mark Out of Stock" : "Mark In Stock"}
              </button>

              <button class="delete-btn"
                data-delete="${product.id}">
                Remove Listing
              </button>
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }).join("");

  emptyMessage.hidden = filtered.length !== 0;
}


// BASKET
function updateCartCount() {
  document.getElementById("cartCount").textContent =
    cart.reduce((total, item) => total + item.quantity, 0);
}

function addToCart(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) existing.quantity++;
  else cart.push({ ...product, quantity: 1 });

  updateCartCount();
}

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  if (!cart.length) {
    cartItems.innerHTML =
      '<p class="form-note">Your basket is waiting for some garden goodies! 🌱</p>';
    cartTotal.textContent = "";
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-line">
      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <p>${item.quantity} × ${formatPrice(item.price)}</p>
      </div>
      <div>
        <strong>${formatPrice(item.price * item.quantity)}</strong>
        <button class="remove-btn" data-remove="${item.id}">Remove</button>
      </div>
    </div>
  `).join("");

  const total = cart.reduce((sum, item) =>
    sum + item.price * item.quantity, 0);

  cartTotal.textContent = "Estimated total: " + formatPrice(total);
}

// POPUPS
function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.hidden = true;
  if (sellModal.hidden && cartModal.hidden && authModal.hidden) {
    document.body.style.overflow = "";
  }
}

function openAuthModal() {
  authMessage.textContent = "";
  authForm.reset();
  setAuthMode("signup");
  openModal(authModal);
}

function openSellForm() {
  if (!currentUser) {
    alert("Please log in or create a Vegora account before selling.");
    openAuthModal();
    return;
  }

  openModal(sellModal);
  document.getElementById("itemName").focus();
}

// ACCOUNT MODE
function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";

  document.getElementById("authTitle").textContent =
    isSignup ? "Grow with us 🌱" : "Welcome back 🌿";

  document.getElementById("authIntro").textContent =
    isSignup ? "Create your free Vegora account." :
      "Log in to your Vegora account.";

  authSubmit.textContent = isSignup ? "Create account" : "Log in";
  authSwitch.textContent = isSignup ? "Log in instead" : "Create an account";
  nameField.hidden = !isSignup;
  authName.required = isSignup;
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  authMessage.textContent = "";
}

authSwitch.addEventListener("click", () => {
  setAuthMode(authMode === "signup" ? "login" : "signup");
});

// REGISTER AND LOGIN
authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = authName.value.trim();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (authMode === "signup" && !name) {
    authMessage.textContent = "Please enter your name.";
    return;
  }

  authSubmit.disabled = true;
  authMessage.textContent = "Please wait…";

  try {
    if (authMode === "signup") {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      currentUser = result.user;
      updateAccountUI();
      closeModal(authModal);
      alert("Welcome to Vegora, " + name + "! 🌱");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      closeModal(authModal);
      alert("You are now logged in to Vegora! 🌿");
    }
  } catch (error) {
    console.error("Authentication error:", error);

    const messages = {
      "auth/email-already-in-use": "An account already exists with this email. Try logging in.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Choose a stronger password with at least 6 characters.",
      "auth/invalid-credential": "Email or password is incorrect. Please try again.",
      "auth/network-request-failed": "Network problem. Check your internet connection."
    };

    authMessage.textContent =
      messages[error.code] || "We couldn't complete that request. Please try again.";
  } finally {
    authSubmit.disabled = false;
  }
});

// ACCOUNT STATUS
function updateAccountUI() {
  if (currentUser) {
    authBtn.textContent = "Log out";
    userStatus.textContent =
      "Hi, " + (currentUser.displayName || currentUser.email || "Vegora member");
    userStatus.hidden = false;
  } else {
    authBtn.textContent = "👤 Login / Sign Up";
    userStatus.textContent = "";
    userStatus.hidden = true;
  }
}

authBtn.addEventListener("click", async () => {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  if (!confirm("Do you want to log out of Vegora?")) return;

  try {
    await signOut(auth);
    alert("You have logged out.");
  } catch (error) {
    console.error(error);
    alert("Logout failed. Please try again.");
  }
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateAccountUI();
});

// SEARCH AND SORT
searchInput.addEventListener("input", renderProducts);
sortSelect.addEventListener("change", renderProducts);

// CATEGORY FILTERS
document.getElementById("categories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  selectedCategory = button.dataset.category;
  document.querySelectorAll(".category").forEach(item => {
    item.classList.toggle("active", item === button);
  });
  renderProducts();
});

// VIEW ALL
document.getElementById("showAll").addEventListener("click", () => {
  selectedCategory = "All";
  searchInput.value = "";
  sortSelect.value = "default";

  document.querySelectorAll(".category").forEach(button => {
    button.classList.toggle("active", button.dataset.category === "All");
  });
  renderProducts();
});

/* VEGORA SELLER CONTROLS */
productGrid.addEventListener("click", event => {
  const stockButton = event.target.closest("[data-stock]");
  const deleteButton = event.target.closest("[data-delete]");

  if (stockButton) {
    const product = products.find(
      item => item.id === Number(stockButton.dataset.stock)
    );

    if (!product) return;

    if (!currentUser || product.sellerId !== currentUser.uid) {
      alert("You can only manage your own listings.");
      return;
    }

    product.inStock = product.inStock === false;
    renderProducts();
    return;
  }

  if (deleteButton) {
    const product = products.find(
      item => item.id === Number(deleteButton.dataset.delete)
    );

    if (!product) return;

    if (!currentUser || product.sellerId !== currentUser.uid) {
      alert("You can only remove your own listings.");
      return;
    }

    if (!confirm(`Remove "${product.name}" from Vegora?`)) return;

    const index = products.findIndex(item => item.id === product.id);
    if (index !== -1) products.splice(index, 1);

    cart = cart.filter(item => item.id !== product.id);
    updateCartCount();
    renderProducts();

    alert("Listing removed from this demo.");
  }
});

// ADD TO BASKET
productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  addToCart(Number(button.dataset.add));
  button.textContent = "✓ Added";

  setTimeout(() => {
    if (button.isConnected) button.textContent = "+ Basket";
  }, 900);
});

document.getElementById("cartBtn").addEventListener("click", () => {
  renderCart();
  openModal(cartModal);
});

document.getElementById("cartItems").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;

  cart = cart.filter(item => item.id !== Number(button.dataset.remove));
  updateCartCount();
  renderCart();
});

// SELL BUTTONS
document.getElementById("openSell").addEventListener("click", openSellForm);
document.getElementById("heroSell").addEventListener("click", openSellForm);
document.getElementById("bannerSell").addEventListener("click", openSellForm);

// CLOSE BUTTONS
document.getElementById("closeSell").addEventListener("click", () => closeModal(sellModal));
document.getElementById("closeCart").addEventListener("click", () => closeModal(cartModal));
document.getElementById("closeAuth").addEventListener("click", () => closeModal(authModal));

[sellModal, cartModal, authModal].forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal(sellModal);
    closeModal(cartModal);
    closeModal(authModal);
  }
});

// DEMO LISTING — NOT YET SAVED TO FIRESTORE
document.getElementById("sellForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!currentUser) {
    closeModal(sellModal);
    openAuthModal();
    return;
  }

  const name = document.getElementById("itemName").value.trim();
  const category = document.getElementById("itemCategory").value;
  const price = Number(document.getElementById("itemPrice").value);
  const unit = document.getElementById("itemUnit").value.trim();

  if (!name || !unit || !Number.isFinite(price) || price < 1 || price > 100000) {
    alert("Please enter a valid product name, unit and price.");
    return;
  }

products.unshift({
  id: Date.now(),
  name,
  category,
  price,
  unit,
  seller: currentUser.displayName || "Vegora member",
  sellerId: currentUser.uid,
  inStock: true,
  description: "A new listing from our gardening community.",
  image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80"
});


  event.target.reset();
  selectedCategory = "All";
  searchInput.value = "";
  sortSelect.value = "default";

  document.querySelectorAll(".category").forEach(button => {
    button.classList.toggle("active", button.dataset.category === "All");
  });

  renderProducts();
  closeModal(sellModal);
  document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
  alert("Your demo listing has been added! 🌱");
});

// START WEBSITE
renderProducts();
updateCartCount();
updateAccountUI();
