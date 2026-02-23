import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MealService } from '../services/meal';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Date;
}

@Component({
  selector: 'app-deposit',
  imports: [CommonModule, FormsModule],
  templateUrl: './deposit.html',
  styleUrl: './deposit.css'
})
export class Deposit implements OnInit {
  currentBalance = 1500;
  selectedAmount = 0;
  customAmount: number | null = null;
  selectedPaymentMethod = '';
  isProcessing = false;
  errorMessage = '';

  constructor(private mealService: MealService) {}

  ngOnInit() {
    this.loadUserBalance();
  }
  
  quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  
  paymentMethods: PaymentMethod[] = [
    { id: 'upi', name: 'UPI Payment', description: 'Pay using Google Pay, PhonePe, Paytm', icon: '📱' },
    { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay', icon: '💳' },
    { id: 'netbanking', name: 'Net Banking', description: 'Pay directly from your bank account', icon: '🏦' },
    { id: 'wallet', name: 'Digital Wallet', description: 'PayTM, Mobikwik, Amazon Pay', icon: '💰' }
  ];
  
  recentTransactions: Transaction[] = [
    { id: 1, type: 'credit', amount: 500, description: 'Money Added - UPI', date: new Date('2025-08-15') },
    { id: 2, type: 'debit', amount: 249, description: 'Chicken Biryani Order', date: new Date('2025-08-14') },
    { id: 3, type: 'credit', amount: 1000, description: 'Money Added - Card', date: new Date('2025-08-13') },
    { id: 4, type: 'debit', amount: 79, description: 'Fresh Coffee Order', date: new Date('2025-08-12') }
  ];

  get processingFee(): number {
    return this.selectedAmount > 0 ? Math.max(2, this.selectedAmount * 0.01) : 0;
  }

  get totalAmount(): number {
    return this.selectedAmount + this.processingFee;
  }

  selectAmount(amount: number | null) {
    if (amount && amount > 0) {
      this.selectedAmount = amount;
    }
  }

  selectPaymentMethod(methodId: string) {
    this.selectedPaymentMethod = methodId;
  }

  isValidAmount(amount: number | null): boolean {
    return amount !== null && amount >= 10 && amount <= 10000;
  }

  async addMoney() {
    if (!this.selectedPaymentMethod || this.selectedAmount <= 0) {
      this.errorMessage = 'Please select payment method and amount';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    
    try {
      // Create order for wallet recharge
      const orderData = {
        amount: this.totalAmount,
        currency: 'INR',
        type: 'wallet_recharge',
        description: `Wallet recharge of ₹${this.selectedAmount}`
      };

      const order = await firstValueFrom(this.mealService.createOrder(orderData));
      
      // Process payment for wallet recharge
      const paymentData = {
        orderId: order.orderId,
        amount: this.totalAmount,
        method: this.selectedPaymentMethod,
        type: 'wallet_recharge',
        description: `Add ₹${this.selectedAmount} to wallet`
      };

      const paymentResult = await firstValueFrom(this.mealService.processPayment(paymentData));
      
      if (paymentResult.success) {
        // Verify payment
        await firstValueFrom(this.mealService.verifyPayment(paymentResult.transactionId));
        
        // Update wallet balance
        this.currentBalance += this.selectedAmount;
        localStorage.setItem('userBalance', this.currentBalance.toString());
        
        // Add transaction to history
        this.recentTransactions.unshift({
          id: Date.now(),
          type: 'credit',
          amount: this.selectedAmount,
          description: `Money Added - ${this.getPaymentMethodName(this.selectedPaymentMethod)}`,
          date: new Date()
        });
        
        // Store transaction in localStorage
        const transactions = JSON.parse(localStorage.getItem('walletTransactions') || '[]');
        transactions.unshift({
          id: Date.now(),
          type: 'credit',
          amount: this.selectedAmount,
          description: `Money Added - ${this.getPaymentMethodName(this.selectedPaymentMethod)}`,
          date: new Date().toISOString(),
          transactionId: paymentResult.transactionId,
          orderId: order.orderId
        });
        localStorage.setItem('walletTransactions', JSON.stringify(transactions.slice(0, 10))); // Keep last 10 transactions
        
        this.showSuccessMessage(`Successfully added ₹${this.selectedAmount} to your wallet!`, paymentResult.transactionId);
        this.resetForm();
        
      } else {
        this.errorMessage = paymentResult.message || 'Payment failed. Please try again.';
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      
      let errorMessage = 'Failed to add money. Please try again.';
      
      if (error.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.errorMessage = errorMessage;
    } finally {
      this.isProcessing = false;
    }
  }

  getPaymentMethodName(methodId: string): string {
    const method = this.paymentMethods.find(m => m.id === methodId);
    return method ? method.name : 'Unknown';
  }

  resetForm() {
    this.selectedAmount = 0;
    this.customAmount = null;
    this.selectedPaymentMethod = '';
    this.errorMessage = '';
  }

  loadUserBalance() {
    const savedBalance = localStorage.getItem('userBalance');
    if (savedBalance) {
      this.currentBalance = parseInt(savedBalance);
    }
    
    // Load transaction history from localStorage
    const savedTransactions = localStorage.getItem('walletTransactions');
    if (savedTransactions) {
      const transactions = JSON.parse(savedTransactions);
      this.recentTransactions = transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date)
      }));
    }
  }

  showSuccessMessage(message: string, transactionId: string) {
    const successMsg = `${message}\nTransaction ID: ${transactionId}`;
    alert(successMsg);
  }
}
