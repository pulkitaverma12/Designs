import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Cart as CartService, CartItem } from '../cart';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart implements OnInit {
  cartItems: CartItem[] = [];
  totalAmount: number = 0;
  userBalance: number = 0;

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCartItems();
    this.loadUserBalance();
  }

  loadCartItems() {
    this.cartItems = this.cartService.getItems();
    this.calculateTotal();
  }

  loadUserBalance() {
    this.userBalance = this.cartService.getUserBalance();
  }

  calculateTotal() {
    this.totalAmount = this.cartService.getTotal();
  }

  updateQuantity(itemId: number, newQuantity: number) {
    if (newQuantity <= 0) {
      this.removeItem(itemId);
    } else {
      this.cartService.updateQuantity(itemId, newQuantity);
      this.loadCartItems();
    }
  }

  removeItem(itemId: number) {
    this.cartService.removeFromCart(itemId);
    this.loadCartItems();
  }

  increaseQuantity(item: CartItem) {
    this.updateQuantity(item.id, item.quantity + 1);
  }

  decreaseQuantity(item: CartItem) {
    this.updateQuantity(item.id, item.quantity - 1);
  }

  clearCart() {
    if (confirm('Are you sure you want to clear the cart?')) {
      this.cartService.clearCart();
      this.loadCartItems();
    }
  }

  proceedToPayment() {
    if (this.cartItems.length === 0) {
      alert('Your cart is empty! Please add items to cart first.');
      return;
    }

    // Save cart items to localStorage for payment page
    localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
    
    // Navigate to payment page
    this.router.navigate(['/payment']);
  }

  getTotalItems(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }
}
