// ---------- Firebase imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ---------- Your Firebase Config (from you) ----------
const firebaseConfig = {
  apiKey: "AIzaSyCQnhnsbgajGxCv6JqqTKRntfM_ANChCys",
  authDomain: "ms-accessories.firebaseapp.com",
  projectId: "ms-accessories",
  storageBucket: "ms-accessories.firebasestorage.app",
  messagingSenderId: "443081327954",
  appId: "1:443081327954:web:bfb0924f4632d7ee9de68b",
  measurementId: "G-54NJNW0FLR"
};

// ---------- Init Firebase ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ---------- App state ----------
let firebaseUser = null; // if signed in with Google, this holds auth user object

// ---------- Cart Utilities ----------
function saveCartToLocal(cart){ localStorage.setItem('msacc_cart_v1', JSON.stringify(cart)); }
function loadCartFromLocal(){ try{ return JSON.parse(localStorage.getItem('msacc_cart_v1')) || []; }catch(e){return []}}

/**
 * Merges two carts (e.g., a local one and a cloud one), combining quantities
 * of duplicate items.
 */
function mergeCarts(cartA, cartB) {
  const mergedMap = new Map();

  // Process first cart
  cartA.forEach(item => {
    // We must clone the item to avoid modifying the original array
    mergedMap.set(item.id, { ...item }); 
  });

  // Process and merge second cart
  cartB.forEach(localItem => {
    if (mergedMap.has(localItem.id)) {
      // Item exists, just add quantity
      const existingItem = mergedMap.get(localItem.id);
      existingItem.quantity += localItem.quantity;
    } else {
      // New item, add it (cloned)
      mergedMap.set(localItem.id, { ...localItem });
    }
  });

  // Convert the Map's values back into an array
  return Array.from(mergedMap.values());
}

/**
 * Loads the user's cart from their Firestore document.
 */
async function loadCartFromCloud() {
  if (!firebaseUser) return []; // No user, no cloud cart
  try {
    const udoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (udoc.exists() && udoc.data().cart) {
      // Return the cart array saved in their profile
      return udoc.data().cart; 
    }
    return []; // No cart saved in cloud
  } catch (e) { 
    console.error("Error loading cart from cloud: ", e); 
    return []; // Return empty on error
  }
}

// ---------- Hook Firebase auth changes (WITH CART MERGE LOGIC) ----------
onAuthStateChanged(auth, async (user) => {
  firebaseUser = user || null;
  if(user){
    // ----------------------------------------------
    // 1. USER IS LOGGED IN
    // ----------------------------------------------

    // --- NEW CART MERGE LOGIC ---
    const localCart = loadCartFromLocal();
    const cloudCart = await loadCartFromCloud();

    // Merge local guest cart into their cloud cart
    cart = mergeCarts(cloudCart, localCart); // Global cart variable
    
    // If the local cart had items, save the new merged cart to cloud
    // and clear the local cart.
    if (localCart.length > 0) {
      saveCart(); // This will now save to cloud
      saveCartToLocal([]); // Clear the local cart
    }
    // --- END OF NEW CART LOGIC ---
    
    
    // --- Existing profile UI logic (unchanged) ---
    const udoc = await getDoc(doc(db, 'users', user.uid));
    const data = udoc.exists() ? udoc.data() : null;
    
    document.getElementById('account-logged-out').style.display='none';
    document.getElementById('account-logged-in').style.display='block';
    document.getElementById('account-name-display').textContent = (data && data.name) ? data.name : user.displayName || 'User';
    document.getElementById('account-email-display').textContent = user.email;
    document.getElementById('profile-name-edit').textContent = (data && data.name) ? data.name : user.displayName || '';
    document.getElementById('profile-email-edit').textContent = user.email;
    document.getElementById('pf-name').value = (data && data.name) ? data.name : (user.displayName || '');
    document.getElementById('pf-email').value = user.email;
    document.getElementById('pf-phone').value = (data && data.phone) ? data.phone : '';
    document.getElementById('pf-address').value = (data && data.address) ? data.address : '';
    
    const picBox = document.getElementById('profile-pic-edit'); picBox.innerHTML='';
    if(data && data.photo) {
      const img = document.createElement('img'); img.src = data.photo; picBox.appendChild(img);
    } else if(user.photoURL){
      const img = document.createElement('img'); img.src = user.photoURL; picBox.appendChild(img);
    } else { picBox.innerHTML = '<span style="font-weight:800;color:#666">A</span>'; }
    
    updateAccountBubble({ name: document.getElementById('pf-name').value });

    // --- Finally, re-render the cart with the new merged data ---
    renderCart();

  } else {
    // ----------------------------------------------
    // 2. USER IS LOGGED OUT
    // ----------------------------------------------

    // --- NEW LOGOUT CART LOGIC ---
    // User signed out. Their global 'cart' is no longer valid.
    // Load the local "guest" cart.
    cart = loadCartFromLocal();
    // --- END OF NEW LOGIC ---

    // --- Existing logged-out UI logic (unchanged) ---
    document.getElementById('account-logged-out').style.display='block';
    document.getElementById('account-logged-in').style.display='none';
    document.getElementById('account-name-display').textContent = 'Guest';
    document.getElementById('account-email-display').textContent = 'Not signed in';
    document.getElementById('profile-pic-box').innerHTML = '<span id="profile-initials" style="font-weight:800;color:#666">A</span>';
    updateAccountBubble(null);
    
    // --- Finally, re-render the cart with the guest data ---
    renderCart();
  }
});

// ---------- Google sign-in ----------
window.googleSignIn = async function(){
  try{
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // on first sign-in, create or merge Firestore doc
    await setDoc(doc(db,'users',user.uid), {
      name: user.displayName || '',
      email: user.email || '',
      photo: user.photoURL || '',
      phone: '',
      address: '',
      updatedAt: new Date()
    }, { merge: true });
    // UI will update via onAuthStateChanged (which also handles cart merge)
  }catch(err){
    console.error('Google sign-in error', err);
    alert('Google sign-in failed: ' + (err.message || err));
  }
};

// ---------- Logout from Firebase ----------
window.logout = async function(){
  try{
    if(firebaseUser){ await signOut(auth); firebaseUser = null; }
    // UI and cart will update via onAuthStateChanged
    toggleAccountDrawer(); // close drawer
  }catch(e){ console.error(e); }
};

// ---------- Save profile (with local pic fix) ----------
window.saveProfile = async function(){
  // required fields check
  const name = document.getElementById('pf-name').value.trim();
  const phone = document.getElementById('pf-phone').value.trim();
  const address = document.getElementById('pf-address').value.trim();
  if(!name || !phone || !address){ alert('Name, phone and address required.'); return; }
  
  if(firebaseUser){
    // ------------------------------------
    // FIREBASE USER (Cloud)
    // ------------------------------------
    const uid = firebaseUser.uid;
    const picInput = document.getElementById('pf-pic');
    
    if(picInput && picInput.files && picInput.files[0]){
      // New Pic: Read as Data URL and update doc
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await updateDoc(doc(db,'users',uid), { name, phone, address, photo: ev.target.result, updatedAt: new Date() });
        alert('Profile updated (cloud).');
        refreshAccountUI(); // Refresh UI after update
      };
      reader.readAsDataURL(picInput.files[0]);
    } else {
      // No New Pic: Just update the text fields
      await updateDoc(doc(db,'users',uid), { name, phone, address, updatedAt: new Date() });
      alert('Profile updated (cloud).');
      refreshAccountUI(); // Refresh UI after update
    }
  } else {
    // ------------------------------------
    // LOCAL USER (localStorage)
    // ------------------------------------
    const email = document.getElementById('pf-email').value || '';
    const picInput = document.getElementById('pf-pic');
    const existingPic = (loadLocalAccount() || {}).pic || null; // Get existing pic

    if (picInput && picInput.files && picInput.files[0]) {
      // New Pic: Read as Data URL and save to local
      const reader = new FileReader();
      reader.onload = (ev) => {
        const accountObj = { name, email, phone, address, pic: ev.target.result };
        saveLocalAccount(accountObj);
        alert('Profile updated locally (with new pic).');
        refreshAccountUI(); // Refresh UI after update
      };
      reader.readAsDataURL(picInput.files[0]);
    } else {
      // No New Pic: Save other data but *keep the existing pic*
      const accountObj = { name, email, phone, address, pic: existingPic };
      saveLocalAccount(accountObj);
      alert('Profile updated locally.');
      refreshAccountUI(); // Refresh UI after update
    }
  }
};

// ---------- Helper to update account bubble initials ----------
function updateAccountBubble(acc){
  const bubble = document.getElementById('account-bubble');
  if(!acc || !acc.name){ bubble.textContent = 'A'; return; }
  const parts = acc.name.trim().split(' ');
  let initials = parts[0].charAt(0).toUpperCase();
  if(parts.length>1) initials += parts[1].charAt(0).toUpperCase();
  bubble.textContent = initials;
}

// ---------- Local Account Functions (unchanged) ----------
const LOCAL_ACCOUNT_KEY = 'msacc_local_user_v1';
function loadLocalAccount(){ try{ return JSON.parse(localStorage.getItem(LOCAL_ACCOUNT_KEY)) || null }catch(e){ return null } }
function saveLocalAccount(obj){ localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(obj)); }

window.showSignup = function(){ document.getElementById('signup-block').style.display='block'; document.getElementById('login-block').style.display='none'; }
window.hideSignup = function(){ document.getElementById('signup-block').style.display='none'; document.getElementById('login-block').style.display='block'; }

window.createAccount = function(){
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim().toLowerCase();
  const phone = document.getElementById('su-phone').value.trim();
  const address = document.getElementById('su-address').value.trim();
  const picInput = document.getElementById('su-pic');

  if(!name || !email || !phone || !address){ alert('Please fill all required fields: Name, Email, Phone, Address.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('Please enter a valid email.'); return; }
  if(!/^\d{10,15}$/.test(phone)){ alert('Please enter a valid phone number.'); return; }

  if(picInput && picInput.files && picInput.files[0]){
    const file = picInput.files[0];
    const reader = new FileReader();
    reader.onload = function(ev){
      const accountObj = { name, email, phone, address, pic: ev.target.result };
      saveLocalAccount(accountObj);
      alert('Local account created and saved in this browser.');
      hideSignup(); toggleAccountDrawer(); refreshAccountUI();
    };
    reader.readAsDataURL(file);
  } else {
    const accountObj = { name, email, phone, address, pic: null };
    saveLocalAccount(accountObj);
    alert('Local account created and saved in this browser.');
    hideSignup(); toggleAccountDrawer(); refreshAccountUI();
  }
};

window.doLogin = function(){
  const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
  if(!email){ alert('Enter your email to login.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('Enter a valid email.'); return; }
  const local = loadLocalAccount();
  if(!local || local.email !== email){ alert('Local account not found for this email. Please create account or use Google sign-in.'); return; }
  alert('Local login successful.');
  // populate logged-in UI from local account (non-cloud)
  toggleAccountDrawer();
  refreshAccountUI();
};

// ---------- Refresh Account UI (decides whether cloud or local) ----------
function refreshAccountUI(){
  // If firebaseUser present, onAuthStateChanged already set the UI. If not, check local account:
  if(firebaseUser) return; // firebase onAuthStateChanged handles UI
  const local = loadLocalAccount();
  if(local){
    document.getElementById('account-logged-out').style.display='none';
    document.getElementById('account-logged-in').style.display='block';
    document.getElementById('account-name-display').textContent = local.name;
    document.getElementById('account-email-display').textContent = local.email;
    document.getElementById('profile-name-edit').textContent = local.name;
    document.getElementById('profile-email-edit').textContent = local.email;
    document.getElementById('pf-name').value = local.name;
    document.getElementById('pf-email').value = local.email;
    document.getElementById('pf-phone').value = local.phone;
    document.getElementById('pf-address').value = local.address;
    document.getElementById('profile-pic-edit').innerHTML = local.pic ? '<img src="'+local.pic+'">' : '<span style="font-weight:800;color:#666">A</span>';
    document.getElementById('profile-pic-box').innerHTML = local.pic ? '<img src="'+local.pic+'">' : '<span id="profile-initials" style="font-weight:800;color:#666">A</span>';
    updateAccountBubble(local);
  } else {
    // show logged out
    document.getElementById('account-logged-out').style.display='block';
    document.getElementById('account-logged-in').style.display='none';
    document.getElementById('account-name-display').textContent = 'Guest';
    document.getElementById('account-email-display').textContent = 'Not signed in';
    document.getElementById('profile-pic-box').innerHTML = '<span id="profile-initials" style="font-weight:800;color:#666">A</span>';
    updateAccountBubble(null);
  }
}

// ---------- Account drawer toggle ----------
const drawer = document.getElementById('account-drawer'); let accountOpen=false;
window.toggleAccountDrawer = function(){
  accountOpen = !accountOpen;
  drawer.classList.toggle('open', accountOpen);
  drawer.setAttribute('aria-hidden', String(!accountOpen));
  if(accountOpen) refreshAccountUI();
};

// ---------- CART & SHOP logic ----------
const PRODUCTS = {
  p1:{id:'p1',name:'Gold Necklace',price:1200,image:'dummy.jpg',category:'Necklace'},
  p2:{id:'p2',name:'Silver Earrings',price:499,image:'dummy.jpg',category:'Earrings'},
  p3:{id:'p3',name:'Leather Bracelet',price:799,image:'dummy.jpg',category:'Bracelets'},
  p4:{id:'p4',name:'Combo Box Special',price:1999,image:'dummy.jpg',category:'Combo Boxes'}
};

let cart = loadCartFromLocal(); // persisted in localStorage or cloud (set by onAuthStateChanged)

/**
 * Saves the cart. If the user is logged in (firebaseUser exists),
 * it saves to their Firestore doc. Otherwise, it saves to localStorage.
 */
function saveCart(){
  if (firebaseUser) {
    // Save to cloud (asynchronously)
    // We use updateDoc to avoid overwriting other profile fields
    updateDoc(doc(db, 'users', firebaseUser.uid), {
      cart: cart
    }).catch(e => console.error("Error saving cart to cloud: ", e));
  } else {
    // Save to local
    saveCartToLocal(cart);
  }
}

function findCartItem(id){ return cart.find(it=>it.id===id); }
function updateCartCount(){ const totalQty = cart.reduce((s,it)=>s+it.quantity,0); document.getElementById('cart-count').textContent = totalQty; saveCart(); }

// product card click
window.cardClicked = function(event,id){ viewProduct(PRODUCTS[id].name, PRODUCTS[id].price, PRODUCTS[id].image, id); }

// view product
window.viewProduct = function(name, price, image, id){
  window.selectedProduct = { id, name, price, image };
  document.getElementById('detail-name').textContent = name;
  document.getElementById('detail-image').src = image;
  document.getElementById('detail-price').textContent = 'Price: ₹' + price;
  document.getElementById('home-section').classList.remove('show');
  document.getElementById('product-details').classList.add('show');
  document.getElementById('cart-section').classList.remove('show');
  document.getElementById('payment-section').classList.remove('show');
  document.getElementById('search-bar').style.display='none';
  document.getElementById('category-tabs').style.display='none';
  updateProductCardUI(id);
};

window.backHome = function(){
  document.getElementById('product-details').classList.remove('show');
  document.getElementById('home-section').classList.add('show');
  document.getElementById('cart-section').classList.remove('show');
  document.getElementById('payment-section').classList.remove('show');
  document.getElementById('search-bar').style.display='block';
  document.getElementById('category-tabs').style.display='flex';
};

// add to cart
window.addToCartNow = function(id){
  const prod = PRODUCTS[id];
  const existing = findCartItem(id);
  if(existing) existing.quantity += 1;
  else cart.push({ id: prod.id, name: prod.name, price: prod.price, image: prod.image, quantity: 1 });
  updateCartCount(); updateProductCardUI(id); renderCart(); // saveCart() is called by updateCartCount()
};
window.addToCart = function(){ if(!window.selectedProduct || !window.selectedProduct.id) return; addToCartNow(window.selectedProduct.id); };

// buy now
window.buyNow = function(id){ addToCartNow(id); proceedToPayment(); };

// proceed to payment
window.proceedToPayment = function(){
  document.getElementById('home-section').classList.remove('show');
  document.getElementById('product-details').classList.remove('show');
  document.getElementById('cart-section').classList.remove('show');
  document.getElementById('payment-section').classList.add('show');
  document.getElementById('search-bar').style.display='none';
  document.getElementById('category-tabs').style.display='none';

  const checkoutItems = document.getElementById('checkout-items'); checkoutItems.innerHTML=''; let total=0;
  cart.forEach(it=>{ total += it.price * it.quantity; const div = document.createElement('div'); div.style.display='flex'; div.style.justifyContent='space-between'; div.style.marginBottom='6px'; div.innerHTML = `<div style="font-weight:600">${it.name} × ${it.quantity}</div><div>₹${it.price*it.quantity}</div>`; checkoutItems.appendChild(div); });
  document.getElementById('checkout-total').textContent = total;
  selectPayment(null); document.getElementById('payment-confirm').style.display='none';
};

// update product card UI
function updateProductCardUI(id){
  const actions = document.getElementById('actions-'+id);
  const existing = findCartItem(id);
  if(!actions) return;
  if(existing && existing.quantity>0){
    actions.innerHTML = `<div class="qty-box" id="qtybox-${id}" onclick="event.stopPropagation()"><button onclick="decreaseFromCard(event,'${id}')">−</button><div class="qty-number" id="qtynum-${id}">${existing.quantity}</div><button onclick="increaseFromCard(event,'${id}')">+</button></div>`;
  } else {
    actions.innerHTML = `<button class="btn btn-add" onclick="event.stopPropagation(); addToCartNow('${id}')">Add to Cart</button><button class="btn buy btn-buy" onclick="event.stopPropagation(); buyNow('${id}')">Buy Now</button>`;
  }
}
window.increaseFromCard = function(e,id){ e.stopPropagation(); changeQtyFromCard(id,1); }
window.decreaseFromCard = function(e,id){ e.stopPropagation(); changeQtyFromCard(id,-1); }
function changeQtyFromCard(id,delta){
  const item = findCartItem(id);
  if(!item && delta>0) cart.push({ id: PRODUCTS[id].id, name: PRODUCTS[id].name, price: PRODUCTS[id].price, image: PRODUCTS[id].image, quantity: 1 });
  else if(item){ item.quantity += delta; if(item.quantity<=0){ cart = cart.filter(x=>x.id !== id); } }
  updateCartCount();
  const numEl = document.getElementById('qtynum-'+id);
  if(numEl){ const newItem = findCartItem(id); if(newItem) numEl.textContent = newItem.quantity; else updateProductCardUI(id);} else updateProductCardUI(id);
  renderCart(); // saveCart() is called by updateCartCount()
}

// render cart
function renderCart(){
  const container = document.getElementById('cart-items'); container.innerHTML=''; let total=0;
  cart.forEach((it,index)=>{ total += it.price * it.quantity; const row = document.createElement('div'); row.className='cart-row'; row.innerHTML = `<div class="cart-left"><img src="${it.image}" alt="${it.name}"><div><div class.cart-name">${it.name}</div><div style="color:#666;font-size:13px;">₹${it.price} each</div></div></div><div class="cart-controls"><div class="qty-box" onclick="event.stopPropagation()"><button onclick="cartDecrease(event, ${index})">−</button><div class="qty-number" id="cart-qty-${it.id}">${it.quantity}</div><button onclick="cartIncrease(event, ${index})">+</button></div></div>`; container.appendChild(row); });
  document.getElementById('total').textContent = total; 
  // Update count and save cart (if not already done)
  const totalQty = cart.reduce((s,it)=>s+it.quantity,0); 
  document.getElementById('cart-count').textContent = totalQty;
  saveCart();
  // Refresh product cards to show qty boxes
  Object.keys(PRODUCTS).forEach(pid => updateProductCardUI(pid));
}
window.cartIncrease = function(e,idx){ e.stopPropagation(); cart[idx].quantity += 1; renderCart(); } // renderCart() calls saveCart()
window.cartDecrease = function(e,idx){ e.stopPropagation(); cart[idx].quantity -= 1; if(cart[idx].quantity <= 0){ const id = cart[idx].id; cart.splice(idx,1); } renderCart(); } // renderCart() calls saveCart()

// search & category
window.searchProducts = function(){ const term = document.getElementById('search-bar').value.trim().toLowerCase(); document.querySelectorAll('.product-card').forEach(card=>{ const name = card.getAttribute('data-name').toLowerCase(); card.style.display = name.includes(term) ? 'block' : 'none'; }); }
window.filterCategory = function(cat){ document.querySelectorAll('.product-card').forEach(card=>{ if(cat==='All'){ card.style.display='block'; return;} card.style.display = card.getAttribute('data-category')===cat ? 'block' : 'none'; }); }

// payment selection & processing
let selectedPaymentMethod = null;
window.selectPayment = function(method){
  selectedPaymentMethod = method;
  document.getElementById('upi-details').style.display='none';
  document.getElementById('card-details').style.display='none';
  document.getElementById('netbank-details').style.display='none';
  if(!method){ document.querySelectorAll('input[name="payment"]').forEach(r=>r.checked=false); return; }
  document.querySelectorAll('input[name="payment"]').forEach(r=> r.checked = (r.value===method));
  if(method==='upi') document.getElementById('upi-details').style.display='block';
  if(method==='card') document.getElementById('card-details').style.display='block';
  if(method==='netbank') document.getElementById('netbank-details').style.display='block';
};
window.processPayment = function(){
  if(cart.length===0){ alert('Cart empty'); return; }
  if(!selectedPaymentMethod){ alert('Select payment method'); return; }
  if(selectedPaymentMethod==='upi'){ const upi = document.getElementById('upi-id').value.trim(); if(!upi){ alert('Enter UPI ID'); return; } }
  if(selectedPaymentMethod==='card'){ const cnum=document.getElementById('card-number').value.trim(), cname=document.getElementById('card-name').value.trim(), cexp=document.getElementById('card-exp').value.trim(), cvv=document.getElementById('card-cvv').value.trim(); if(!cnum||!cname||!cexp||!cvv){ alert('Fill card details'); return; } }
  if(selectedPaymentMethod==='netbank'){ const bank=document.getElementById('bank-select').value; if(!bank){ alert('Select bank'); return; } }
  const payBtn = document.querySelector('#payment-section .btn.buy'); payBtn.disabled=true; payBtn.textContent='Processing...';
  setTimeout(()=>{ document.getElementById('payment-confirm').style.display='block'; payBtn.disabled=false; payBtn.textContent='Proceed to Pay'; cart=[]; saveCart(); renderCart(); setTimeout(()=>{ showSection('home'); document.getElementById('payment-confirm').style.display='none'; },1300); },900);
};

// show section helper
window.showSection = function(section){
  document.getElementById('home-section').classList.toggle('show', section==='home');
  document.getElementById('product-details').classList.toggle('show', section==='product');
  document.getElementById('cart-section').classList.toggle('show', section==='cart');
  document.getElementById('payment-section').classList.toggle('show', section==='payment');
  if(section==='home'){ document.getElementById('search-bar').style.display='block'; document.getElementById('category-tabs').style.display='flex'; } else { document.getElementById('search-bar').style.display='none'; document.getElementById('category-tabs').style.display='none'; }
  if(section==='cart') renderCart();
  if(section==='payment') proceedToPayment();
};

// init UI
window.initUI = function(){ 
  // cart is loaded by onAuthStateChanged, which runs on page load
  // so we just need to render
  renderCart(); 
  refreshAccountUI(); 
};
window.addEventListener('DOMContentLoaded', initUI);

// small helper to toggle drawer (already exposed)
window.enlargeLogo = function(img){ img.style.transform = img.style.transform === 'scale(1.4)' ? 'scale(1)' : 'scale(1.4)'; };
