import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    this.mealService.getCategories().subscribe({
      next: (categories: any[]) => {
        // Filter out non-vegetarian categories
        const nonVegCategories = ['beef', 'chicken', 'lamb', 'pork', 'seafood', 'goat'];
        const vegCategories = categories
          .filter((cat: any) => !nonVegCategories.includes(cat.strCategory.toLowerCase()))
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
    this.loadCategoryMeals(category);
  }

  loadCategoryMeals(category: string) {
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

  addToCart(item: MenuItem) {
    const cartItem = {
      id: parseInt(item.id),
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image
    };
    
    this.cartService.addToCart(cartItem);
    
    // Show success message
    alert(`${item.name} added to cart!`);
  }

  searchMeals(query: string) {
    if (!query.trim()) {
      this.loadRandomMeals();
      return;
    }

    this.loading = true;
    this.mealService.searchMeals(query).subscribe({
      next: (meals: any[]) => {
        // Filter vegetarian meals from search results
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
        console.error('Error searching meals:', error);
        this.error = 'Failed to search meals';
        this.loading = false;
      }
    });
  }

  // Quantity control methods
  increaseQuantity(item: MenuItem) {
    if (!item.quantity) {
      item.quantity = 0;
    }
    item.quantity++;
  }

  decreaseQuantity(item: MenuItem) {
    if (item.quantity && item.quantity > 0) {
      item.quantity--;
    }
  }
}
