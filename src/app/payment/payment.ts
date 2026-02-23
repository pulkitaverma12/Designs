import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Cart } from '../cart';
import { MealService } from '../services/meal';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message: string;
}

@Component({
  selector: 'app-payment',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment implements OnInit {
  private cartService = inject(Cart);
  private mealService = inject(MealService);
  private router = inject(Router);

  cartItems: CartItem[] = [];
  selectedPaymentMethod: string = '';
  isProcessing: boolean = false;
  userBalance: number = 2500; // Mock wallet balance
  
  // Payment form data
  cardDetails: CardDetails = {
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  };

  customerDetails: CustomerDetails = {
    name: '',
    phone: '',
    address: ''
  };
  
  upiId: string = '';
  selectedBank: string = '';

  // Calculated values
  subtotal: number = 0;
  tax: number = 0;
  deliveryFee: number = 50;
  grandTotal: number = 0;

  ngOnInit() {
    this.loadCartItems();
    this.calculateTotals();
    this.loadUserBalance();
  }

  loadCartItems() {
    // Get cart items from cart service
    this.cartItems = this.cartService.getItems().map(item => ({
      id: item.id.toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || ''
    }));
    
    // Also check localStorage as backup
    if (this.cartItems.length === 0) {
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        this.cartItems = JSON.parse(savedCart);
      }
    }
    
    // If no items, redirect to menu
    if (this.cartItems.length === 0) {
      alert('Your cart is empty. Please add items to cart first.');
      this.router.navigate(['/menu']);
    }
  }

  loadUserBalance() {
    // Load user balance from localStorage or use default
    const savedBalance = localStorage.getItem('userBalance');
    if (savedBalance) {
      this.userBalance = parseInt(savedBalance);
    }
  }

  calculateTotals() {
    this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.tax = Math.round(this.subtotal * 0.05); // 5% tax
    this.grandTotal = this.subtotal + this.tax + this.deliveryFee;
  }

  selectPaymentMethod(method: string) {
    this.selectedPaymentMethod = method;
  }

  canProceedPayment(): boolean {
    // Check customer details first
    if (!this.customerDetails.name || !this.customerDetails.phone || !this.customerDetails.address) {
      return false;
    }
    
    if (!this.selectedPaymentMethod) return false;
    
    switch (this.selectedPaymentMethod) {
      case 'wallet':
        return this.userBalance >= this.grandTotal;
      case 'card':
        return !!(this.cardDetails.number && this.cardDetails.expiry && 
               this.cardDetails.cvv && this.cardDetails.name);
      case 'upi':
        return this.upiId.trim() !== '';
      case 'netbanking':
        return this.selectedBank !== '';
      default:
        return false;
    }
  }

  async processPayment() {
    if (!this.canProceedPayment()) return;
    
    this.isProcessing = true;

    try {
      // First create order
      const orderData = {
        amount: this.grandTotal,
        items: this.cartItems,
        currency: 'INR'
      };

      const order = await firstValueFrom(this.mealService.createOrder(orderData));
      
      // Then process payment
      const paymentData = {
        orderId: order.orderId,
        amount: this.grandTotal,
        method: this.selectedPaymentMethod,
        customerName: this.customerDetails.name,
        customerPhone: this.customerDetails.phone,
        customerAddress: this.customerDetails.address,
        items: this.cartItems,
        ...this.getPaymentMethodData()
      };

      const paymentResult = await firstValueFrom(this.mealService.processPayment(paymentData));
      
      if (paymentResult.success) {
        // Verify payment
        await firstValueFrom(this.mealService.verifyPayment(paymentResult.transactionId));
        
        // Clear cart from both service and localStorage
        this.cartService.clearCart();
        localStorage.removeItem('cartItems');
        
        // Store order details for confirmation
        const orderDetails = {
          orderId: order.orderId,
          items: this.cartItems,
          total: this.grandTotal,
          paymentMethod: this.selectedPaymentMethod,
          transactionId: paymentResult.transactionId,
          orderDate: new Date().toISOString(),
          status: 'completed'
        };
        
        localStorage.setItem('lastOrder', JSON.stringify(orderDetails));
        
        // Update wallet balance if wallet payment
        if (this.selectedPaymentMethod === 'wallet') {
          this.userBalance -= this.grandTotal;
          localStorage.setItem('userBalance', this.userBalance.toString());
        }
        
        // Show success and redirect
        this.showSuccessMessage(paymentResult.transactionId, order.orderId);
        
      } else {
        this.showErrorMessage(paymentResult.message);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      let errorMessage = 'Payment failed. Please try again.';
      
      // Handle different types of errors
      if (error.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showErrorMessage(errorMessage);
    } finally {
      this.isProcessing = false;
    }
  }

  private getPaymentMethodData() {
    switch (this.selectedPaymentMethod) {
      case 'card':
        return {
          cardNumber: this.maskCardNumber(this.cardDetails.number),
          cardHolder: this.cardDetails.name
        };
      case 'upi':
        return { upiId: this.upiId };
      case 'netbanking':
        return { bankCode: this.selectedBank };
      case 'wallet':
        return { walletBalance: this.userBalance };
      default:
        return {};
    }
  }

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s/g, '');
    return '**** **** **** ' + cleaned.slice(-4);
  }

  private async simulatePaymentAPI(): Promise<PaymentResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate random success/failure for demo
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      return {
        success: true,
        transactionId: 'TXN' + Date.now(),
        message: 'Payment successful'
      };
    } else {
      return {
        success: false,
        message: 'Payment failed. Please check your details.'
      };
    }
  }

  private showSuccessMessage(transactionId: string, orderId?: string) {
    const orderInfo = orderId ? `\nOrder ID: ${orderId}` : '';
    alert(`Payment Successful! 
Transaction ID: ${transactionId}${orderInfo}
Amount: ₹${this.grandTotal}

Your order has been placed successfully! 
You will receive a confirmation shortly.

Redirecting to home page...`);
    
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 3000);
  }

  private showErrorMessage(message: string) {
    alert(`Payment Failed: ${message}`);
  }

  // Utility methods for UI
  formatCardNumber(number: string): string {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  getPaymentMethodIcon(method: string): string {
    const icons: { [key: string]: string } = {
      'wallet': '',
      'card': '',
      'upi': '',
      'netbanking': ''
    };
    return icons[method] || '';
  }
}
