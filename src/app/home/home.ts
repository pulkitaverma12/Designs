import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MealService, MenuItem } from '../services/meal';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  todaysSpecials: MenuItem[] = [];
  loading = true;

  constructor(private mealService: MealService) {}

  ngOnInit() {
    this.loadTodaysSpecials();
  }

  loadTodaysSpecials() {
    this.loading = true;
    this.mealService.getRandomMeals(4).subscribe({
      next: (meals: any[]) => {
        this.todaysSpecials = meals.map((meal: any) => this.mealService.convertToMenuItem(meal));
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading today\'s specials:', error);
        this.loading = false;
      }
    });
  }
}
