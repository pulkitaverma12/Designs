import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Menu } from './menu/menu';
import { Cart } from './cart/cart';
import { Payment } from './payment/payment';
import { Deposit } from './deposit/deposit';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'home', component: Home },
  { path: 'menu', component: Menu },
  { path: 'cart', component: Cart },
  { path: 'payment', component: Payment },
  { path: 'deposit', component: Deposit },
  { path: '**', redirectTo: '' }
];
