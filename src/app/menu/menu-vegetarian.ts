import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { RouterLink } from '@angular/router';
import { MealService, MenuItem, Category } from '../services/meal';
import { Cart } from '../cart';

@Component({
  selector: 'app-menu',
  imports: [CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit {
  selectedCategory = 'All';
  categories: string[] = ['All'];
  menuItems: MenuItem[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private mealService: MealService,
    private cartService: Cart
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.mealService.getCategories().subscribe({
      next: (categories: Category[]) => {
        // Filter to show only vegetarian categories (no meat/non-veg)
        const vegCategories = categories
          .filter((cat: any) => {
            const categoryName = cat.strCategory.toLowerCase();
            return ![
              'beef', 'chicken', 'lamb', 'pork', 'seafood', 'goat'
            ].includes(categoryName);
          })
          .map((cat: any) => cat.strCategory);
        
        this.categories = ['All', ...vegCategories];
        this.loading = false;
        // Load meals for first category
        this.loadRandomMeals();
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
        this.error = 'Failed to load categories';
        this.loading = false;
      }
    });
  }

  loadRandomMeals() {
    this.loading = true;
    this.mealService.getRandomMeals(12).subscribe({
      next: (meals: any[]) => {
        // Filter out non-veg meals from random selection too
        const vegMeals = meals.filter((meal: any) => {
          const category = meal.strCategory?.toLowerCase() || '';
          return ![
            'beef', 'chicken', 'lamb', 'pork', 'seafood', 'goat'
          ].includes(category);
        });
        
        this.menuItems = vegMeals.map((meal: any) => this.mealService.convertToMenuItem(meal));
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading meals:', error);
        this.error = 'Failed to load menu items';
        this.loading = false;
      }
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.loading = true;
    this.error = null;
    
    if (category === 'All') {
      this.loadRandomMeals();
    } else {
      this.mealService.getMealsByCategory(category).subscribe({
        next: (meals: any[]) => {
          // Get detailed info for each meal to have complete data
          const mealPromises = meals.slice(0, 12).map((meal: any) => 
            this.mealService.getMealById(meal.idMeal).toPromise()
              .then((detailedMeal: any) => {
                if (detailedMeal) {
                  return this.mealService.convertToMenuItem(detailedMeal);
                }
                throw new Error('No meal data found');
              })
          );
          
          Promise.all(mealPromises).then(items => {
            this.menuItems = items;
            this.loading = false;
          }).catch((error: any) => {
            console.error('Error loading detailed meals:', error);
            this.error = 'Failed to load detailed meal information';
            this.loading = false;
          });
        },
        error: (error: any) => {
          console.error('Error loading category meals:', error);
          this.error = 'Failed to load category items';
          this.loading = false;
        }
      });
    }
  }

  increaseQuantity(item: MenuItem) {
    item.quantity = (item.quantity || 0) + 1;
  }

  decreaseQuantity(item: MenuItem) {
    if ((item.quantity || 0) > 0) {
      item.quantity = (item.quantity || 0) - 1;
    }
  }

  addToCart(item: MenuItem) {
    if (item.quantity && item.quantity > 0) {
      const cartItem = {
        id: parseInt(item.id),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      };
      
      this.cartService.addToCart(cartItem);
      alert(`Added ${item.quantity} x ${item.name} to cart!`);
      item.quantity = 0; // Reset quantity after adding to cart
    }
  }
}
