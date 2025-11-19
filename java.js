// LOGO ENLARGE
function enlargeLogo(img){
  img.style.transform = img.style.transform === "scale(2)" ? "scale(1)" : "scale(2)";
}

// CART
let selectedProduct = {};
let cart = [];

// SHOW SECTIONS
function showSection(section) {
  const homeSection = document.getElementById("home-section");
  const productSection = document.getElementById("product-details");
  const cartSection = document.getElementById("cart-section");
  const searchBar = document.getElementById("search-bar");
  const categoryTabs = document.getElementById("category-tabs");

  homeSection.style.display = section==='home' ? 'block':'none';
  productSection.style.display = 'none';
  cartSection.style.display = section==='cart' ? 'block':'none';

  if(section==='home'){
    searchBar.style.display='block';
    categoryTabs.style.display='block';
  }else{
    searchBar.style.display='none';
    categoryTabs.style.display='none';
  }

  if(section==='cart') loadCart();
}

// VIEW PRODUCT
function viewProduct(name, price, image) {
  selectedProduct = {name, price, image};
  document.getElementById("detail-name").textContent = name;
  document.getElementById("detail-image").src = image;
  document.getElementById("detail-price").textContent = "Price: ₹"+price;
  document.getElementById("home-section").style.display='none';
  document.getElementById("product-details").style.display='block';
  document.getElementById("search-bar").style.display='none';
  document.getElementById("category-tabs").style.display='none';
}

// BACK HOME
function backHome() {
  document.getElementById("product-details").style.display='none';
  document.getElementById("home-section").style.display='block';
  document.getElementById("search-bar").style.display='block';
  document.getElementById("category-tabs").style.display='block';
}

// ADD TO CART
function addToCart() {
  cart.push({...selectedProduct, quantity:1});
  updateCartCount();
  alert("Added to cart!");
}

function addToCartNow(name, price, image){
  cart.push({name, price, image, quantity:1});
  updateCartCount();
  alert("Added to cart!");
}

// BUY NOW
function buyNow(name, price, image){
  cart.push({name, price, image, quantity:1});
  updateCartCount();
  showSection('cart');
}

// UPDATE CART COUNT
function updateCartCount(){
  document.getElementById("cart-count").textContent = cart.length;
}

// LOAD CART
function loadCart(){
  let container = document.getElementById("cart-items");
  container.innerHTML="";
  let total=0;
  cart.forEach((item,index)=>{
    total += item.price*item.quantity;
    container.innerHTML+=`
      <div class="cart-row" onclick="viewProduct('${item.name}',${item.price},'${item.image}')">
        <img src="${item.image}">
        <span>${item.name}</span>
        <input type="number" min="1" value="${item.quantity}" onchange="changeQty(${index},this.value)" onclick="event.stopPropagation()">
        <button onclick="removeItem(${index}); event.stopPropagation();">X</button>
      </div>
    `;
  });
  document.getElementById("total").textContent=total;
}

// EDIT CART
function changeQty(index,newQty){
  cart[index].quantity = parseInt(newQty);
  loadCart();
}

function removeItem(index){
  cart.splice(index,1);
  updateCartCount();
  loadCart();
}

// SEARCH
function searchProducts(){
  let search = document.getElementById("search-bar").value.toLowerCase();
  document.querySelectorAll(".product-card").forEach(card=>{
    let name = card.getAttribute("data-name").toLowerCase();
    card.style.display = name.includes(search) ? "block":"none";
  });
}

// CATEGORY FILTER
function filterCategory(category){
  document.querySelectorAll(".product-card").forEach(card=>{
    if(category==='All'){card.style.display='block';
    }else{
      card.style.display = card.getAttribute("data-category")===category ? 'block':'none';
    }
  });
}