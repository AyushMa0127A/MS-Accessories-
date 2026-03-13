// -----------------------------
// BASIC SHOP DATA
// -----------------------------

const OWNER_UPI_ID = "ayush.mallick2010ail.com@oksbi";
const OWNER_NAME = "MS Accessories";

const PRODUCTS = {
  p1:{id:'p1',name:'Gold Necklace',price:1200,image:'dummy.jpg',category:'Necklace'},
  p2:{id:'p2',name:'Silver Earrings',price:499,image:'dummy.jpg',category:'Earrings'},
  p3:{id:'p3',name:'Leather Bracelet',price:799,image:'dummy.jpg',category:'Bracelets'},
  p4:{id:'p4',name:'Combo Box Special',price:1999,image:'dummy.jpg',category:'Combo Boxes'}
};

// -----------------------------
// CART STORAGE
// -----------------------------

let cart = JSON.parse(localStorage.getItem("ms_cart")) || [];

function saveCart(){
    localStorage.setItem("ms_cart",JSON.stringify(cart));
}

function updateCartCount(){
    const total = cart.reduce((s,i)=>s+i.quantity,0);
    document.getElementById("cart-count").textContent = total;
}

function findCartItem(id){
    return cart.find(i=>i.id===id);
}

// -----------------------------
// ADD TO CART
// -----------------------------

window.addToCartNow=function(id){

    const p=PRODUCTS[id];
    let item=findCartItem(id);

    if(item){
        item.quantity+=1;
    }else{
        cart.push({
            id:p.id,
            name:p.name,
            price:p.price,
            image:p.image,
            quantity:1
        });
    }

    saveCart();
    renderCart();
}

// -----------------------------
// CART RENDER
// -----------------------------

function renderCart(){

    const container=document.getElementById("cart-items");
    container.innerHTML="";

    let total=0;

    cart.forEach((item,index)=>{

        total+=item.price*item.quantity;

        const row=document.createElement("div");
        row.className="cart-row";

        row.innerHTML=`
        <div class="cart-left">
        <img src="${item.image}">
        <div>
        <div>${item.name}</div>
        <div>₹${item.price}</div>
        </div>
        </div>

        <div class="cart-controls">
        <button onclick="cartDecrease(${index})">-</button>
        <span>${item.quantity}</span>
        <button onclick="cartIncrease(${index})">+</button>
        </div>
        `;

        container.appendChild(row);

    });

    document.getElementById("total").textContent=total;

    updateCartCount();
}

// -----------------------------
// CART CONTROLS
// -----------------------------

window.cartIncrease=function(i){
    cart[i].quantity++;
    saveCart();
    renderCart();
}

window.cartDecrease=function(i){

    cart[i].quantity--;

    if(cart[i].quantity<=0){
        cart.splice(i,1);
    }

    saveCart();
    renderCart();
}

// -----------------------------
// PRODUCT VIEW
// -----------------------------

window.viewProduct=function(name,price,id){

    window.selectedProduct={name,price,id};

    document.getElementById("detail-name").textContent=name;
    document.getElementById("detail-price").textContent="₹"+price;

    showSection("product");
}

// -----------------------------
// BUY NOW
// -----------------------------

window.buyNow=function(id){

    addToCartNow(id);
    showSection("cart");

}

// -----------------------------
// SHIPPING
// -----------------------------

window.goToShipping=function(){

    if(cart.length===0){
        alert("Cart empty");
        return;
    }

    showSection("shipping");
}

// -----------------------------
// PAYMENT SETUP
// -----------------------------

window.proceedToPaymentSetup=function(){

    showSection("payment");

    let total=0;

    const box=document.getElementById("checkout-items");
    box.innerHTML="";

    cart.forEach(i=>{

        total+=i.price*i.quantity;

        const d=document.createElement("div");

        d.innerHTML=`
        ${i.name} × ${i.quantity}
        ₹${i.price*i.quantity}
        `;

        box.appendChild(d);
    });

    document.getElementById("checkout-total").textContent=total;

    const upiLink=`upi://pay?pa=${OWNER_UPI_ID}&pn=${OWNER_NAME}&am=${total}&cu=INR`;

    document.querySelector(".deep-link-box").innerHTML=`
    <a href="${upiLink}" class="btn buy" style="display:block;text-align:center;">
    Pay Now with UPI
    </a>
    `;

    document.getElementById("upi-id").textContent=OWNER_UPI_ID;

}

// -----------------------------
// PROCESS PAYMENT
// -----------------------------

window.processPayment=function(){

    if(cart.length===0){
        alert("Cart empty");
        return;
    }

    const order={
        id:Date.now(),
        items:cart,
        total:document.getElementById("checkout-total").textContent,
        date:new Date().toLocaleString()
    };

    let orders=JSON.parse(localStorage.getItem("ms_orders"))||[];

    orders.push(order);

    localStorage.setItem("ms_orders",JSON.stringify(orders));

    cart=[];
    saveCart();

    renderCart();

    alert("Order placed successfully!");

    showSection("home");
}

// -----------------------------
// SEARCH
// -----------------------------

window.searchProducts=function(){

    const term=document.getElementById("search-bar").value.toLowerCase();

    document.querySelectorAll(".product-card").forEach(c=>{

        const name=c.getAttribute("data-name").toLowerCase();

        c.style.display=name.includes(term)?"block":"none";

    });

}

// -----------------------------
// CATEGORY FILTER
// -----------------------------

window.filterCategory=function(cat){

    document.querySelectorAll(".product-card").forEach(card=>{

        if(cat==="All"){
            card.style.display="block";
            return;
        }

        card.style.display=card.getAttribute("data-category")===cat?"block":"none";

    });

}

// -----------------------------
// SECTION CONTROL
// -----------------------------

window.showSection=function(section){

    const map={
        home:"home-section",
        product:"product-details",
        cart:"cart-section",
        shipping:"shipping-section",
        payment:"payment-section"
    };

    Object.values(map).forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.classList.remove("show");
    });

    const target=document.getElementById(map[section]);
    if(target) target.classList.add("show");

}

// -----------------------------
// INIT
// -----------------------------

window.addEventListener("DOMContentLoaded",()=>{

    renderCart();

});
function payWithUPI(){

let total=document.getElementById("checkout-total").innerText;

let orderName="MS Accessories Order";

let upiLink=`upi://pay?pa=ayush.mallick2010ail.com@oksbi&pn=MS Accessories&tn=${orderName}&am=${total}&cu=INR`;

window.location.href=upiLink;

}
