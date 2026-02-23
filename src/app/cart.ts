import { Injectable } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Cart {
  private items: CartItem[] = [];
  private userBalance: number = 500; // Default balance

  getItems(): CartItem[] {
    return this.items;
  }

  addToCart(item: CartItem): void {
    const existingItem = this.items.find(i => i.id === item.id);
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.items.push({ ...item });
    }
  }

  removeFromCart(itemId: number): void {
    this.items = this.items.filter(item => item.id !== itemId);
  }

  updateQuantity(itemId: number, quantity: number): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.quantity = quantity;
      if (item.quantity <= 0) {
        this.removeFromCart(itemId);
      }
    }
  }

  getTotal(): number {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  clearCart(): void {
    this.items = [];
  }

  getUserBalance(): number {
    return this.userBalance;
  }

  updateBalance(amount: number): void {
    this.userBalance += amount;
  }

  processPayment(amount: number): boolean {
    if (this.userBalance >= amount) {
      this.userBalance -= amount;
      return true;
    }
    return false;
  }
}
