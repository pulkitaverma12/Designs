import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MealData {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strIngredient1?: string;
  strIngredient2?: string;
  strIngredient3?: string;
  [key: string]: any;
}

export interface MealResponse {
  meals: MealData[];
}

export interface Category {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
}

export interface CategoryResponse {
  categories: Category[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  area: string;
  ingredients: string[];
  quantity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MealService {
  private baseUrl = 'https://www.themealdb.com/api/json/v1/1';
  private paymentBaseUrl = environment.api.baseUrl;
  private razorpayKeyId = environment.razorpay.keyId;
  private razorpayKeySecret = environment.razorpay.keySecret;

  constructor(private http: HttpClient) { }

  // Get all categories
  getCategories(): Observable<Category[]> {
    return this.http.get<CategoryResponse>(`${this.baseUrl}/categories.php`)
      .pipe(map(response => response.categories));
  }

  // Search meals by category
  getMealsByCategory(category: string): Observable<MealData[]> {
    return this.http.get<MealResponse>(`${this.baseUrl}/filter.php?c=${category}`)
      .pipe(map(response => response.meals || []));
  }

  // Get meal details by ID
  getMealById(id: string): Observable<MealData> {
    return this.http.get<MealResponse>(`${this.baseUrl}/lookup.php?i=${id}`)
      .pipe(map(response => response.meals[0]));
  }

  // Search meals by name
  searchMeals(name: string): Observable<MealData[]> {
    return this.http.get<MealResponse>(`${this.baseUrl}/search.php?s=${name}`)
      .pipe(map(response => response.meals || []));
  }

  // Get random meals
  getRandomMeals(count: number = 6): Observable<MealData[]> {
    const requests = Array(count).fill(null).map(() => 
      this.http.get<MealResponse>(`${this.baseUrl}/random.php`)
        .pipe(map(response => response.meals[0]))
    );
    
    return new Observable(observer => {
      Promise.all(requests.map(req => req.pipe().toPromise()))
        .then(meals => observer.next(meals as MealData[]))
        .catch(error => observer.error(error));
    });
  }

  // Convert API meal to menu item with price
  convertToMenuItem(meal: MealData): MenuItem {
    const ingredients = this.extractIngredients(meal);
    const price = this.generatePrice(meal.strCategory);
    
    return {
      id: meal.idMeal,
      name: meal.strMeal,
      description: this.generateDescription(meal, ingredients),
      price: price,
      category: meal.strCategory,
      image: meal.strMealThumb,
      area: meal.strArea,
      ingredients: ingredients
    };
  }

  // Extract ingredients from meal object
  private extractIngredients(meal: MealData): string[] {
    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(ingredient.trim());
      }
    }
    return ingredients.slice(0, 5); // Take first 5 ingredients
  }

  // Generate price based on category
  private generatePrice(category: string): number {
    const priceRanges: { [key: string]: [number, number] } = {
      'Dessert': [99, 199],
      'Pasta': [149, 249],
      'Vegetarian': [99, 199],
      'Breakfast': [79, 149],
      'Side': [49, 99]
    };

    const range = priceRanges[category] || [99, 299];
    const min = range[0];
    const max = range[1];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Generate description from meal and ingredients
  private generateDescription(meal: MealData, ingredients: string[]): string {
    const area = meal.strArea ? `${meal.strArea} style ` : '';
    const mainIngredients = ingredients.slice(0, 3).join(', ');
    return `Delicious ${area}${meal.strCategory.toLowerCase()} with ${mainIngredients}`;
  }

  // Payment Gateway API Integration
  processPayment(paymentData: any): Observable<any> {
    // For development - use mock response to avoid CORS issues
    if (!environment.production) {
      return new Observable(observer => {
        setTimeout(() => {
          const success = Math.random() > 0.1; // 90% success rate
          
          if (success) {
            observer.next({
              success: true,
              transactionId: 'TXN' + Date.now(),
              message: 'Payment successful',
              amount: paymentData.amount,
              method: paymentData.method,
              razorpay_payment_id: 'pay_' + Date.now(),
              razorpay_order_id: paymentData.orderId || 'order_' + Date.now()
            });
          } else {
            observer.error({
              success: false,
              message: 'Payment failed. Please try again.',
              error_code: 'PAYMENT_FAILED'
            });
          }
          observer.complete();
        }, 2000);
      });
    }

    // For production - use real API
    const paymentEndpoint = `${this.paymentBaseUrl}/payments`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)
    };

    const paymentRequest = {
      amount: paymentData.amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      order_id: paymentData.orderId,
      method: paymentData.method,
      customer: {
        name: paymentData.customerName,
        phone: paymentData.customerPhone,
        email: paymentData.customerEmail || 'customer@example.com'
      },
      notes: {
        address: paymentData.customerAddress,
        order_items: JSON.stringify(paymentData.items)
      }
    };

    return this.http.post<any>(paymentEndpoint, paymentRequest, { headers })
      .pipe(
        map(response => ({
          success: true,
          transactionId: response.id,
          message: 'Payment successful',
          amount: paymentData.amount,
          method: paymentData.method,
          razorpay_payment_id: response.id,
          razorpay_order_id: response.order_id
        }))
      );
  }

  // Create order for payment
  createOrder(orderData: any): Observable<any> {
    // For development - use mock response to avoid CORS issues
    if (!environment.production) {
      return new Observable(observer => {
        setTimeout(() => {
          const orderId = 'order_' + Date.now();
          observer.next({
            orderId: orderId,
            amount: orderData.amount,
            currency: 'INR',
            status: 'created',
            items: orderData.items,
            razorpay_order_id: orderId,
            receipt: 'receipt_' + Date.now()
          });
          observer.complete();
        }, 1000);
      });
    }

    // For production - use real API
    const orderEndpoint = `${this.paymentBaseUrl}/orders`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)
    };

    const orderRequest = {
      amount: orderData.amount * 100, // Amount in paise
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
      notes: {
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        items: JSON.stringify(orderData.items)
      }
    };

    return this.http.post<any>(orderEndpoint, orderRequest, { headers })
      .pipe(
        map(response => ({
          orderId: response.id,
          amount: orderData.amount,
          currency: 'INR',
          status: response.status,
          items: orderData.items,
          razorpay_order_id: response.id,
          receipt: response.receipt
        }))
      );
  }

  // Verify payment status
  verifyPayment(transactionId: string): Observable<any> {
    // For development - use mock response to avoid CORS issues
    if (!environment.production) {
      return new Observable(observer => {
        setTimeout(() => {
          observer.next({
            transactionId: transactionId,
            status: 'captured',
            verified: true,
            timestamp: new Date().toISOString(),
            amount: 299, // Mock amount
            method: 'upi',
            order_id: 'order_' + Date.now()
          });
          observer.complete();
        }, 500);
      });
    }

    // For production - use real API
    const verifyEndpoint = `${this.paymentBaseUrl}/payments/${transactionId}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)
    };

    return this.http.get<any>(verifyEndpoint, { headers })
      .pipe(
        map(response => ({
          transactionId: response.id,
          status: response.status,
          verified: response.status === 'captured',
          timestamp: response.created_at,
          amount: response.amount / 100, // Convert paise to rupees
          method: response.method,
          order_id: response.order_id
        }))
      );
  }

  // Wallet Recharge API
  rechargeWallet(rechargeData: any): Observable<any> {
    // For development - use mock response
    if (!environment.production) {
      return new Observable(observer => {
        setTimeout(() => {
          const success = Math.random() > 0.05; // 95% success rate for wallet recharge
          
          if (success) {
            observer.next({
              success: true,
              transactionId: 'WALLET_' + Date.now(),
              message: 'Wallet recharged successfully',
              amount: rechargeData.amount,
              method: rechargeData.method,
              walletBalance: (rechargeData.currentBalance || 0) + rechargeData.amount
            });
          } else {
            observer.error({
              success: false,
              message: 'Wallet recharge failed. Please try again.',
              error_code: 'RECHARGE_FAILED'
            });
          }
          observer.complete();
        }, 1500);
      });
    }

    // For production - use real wallet API
    const walletEndpoint = `${this.paymentBaseUrl}/wallet/recharge`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)
    };

    return this.http.post<any>(walletEndpoint, rechargeData, { headers })
      .pipe(
        map(response => ({
          success: true,
          transactionId: response.id,
          message: 'Wallet recharged successfully',
          amount: rechargeData.amount,
          method: rechargeData.method,
          walletBalance: response.balance
        }))
      );
  }

  // Get wallet balance
  getWalletBalance(): Observable<any> {
    if (!environment.production) {
      return new Observable(observer => {
        const savedBalance = localStorage.getItem('userBalance');
        const balance = savedBalance ? parseInt(savedBalance) : 1500;
        
        observer.next({
          balance: balance,
          currency: 'INR',
          lastUpdated: new Date().toISOString()
        });
        observer.complete();
      });
    }

    const balanceEndpoint = `${this.paymentBaseUrl}/wallet/balance`;
    const headers = {
      'Authorization': 'Basic ' + btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)
    };

    return this.http.get<any>(balanceEndpoint, { headers });
  }
}
