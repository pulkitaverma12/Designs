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
    this.loading = true;
    this.mealService.getCategories().subscribe({
      next: (categories: Category[]) => {
        // Add all categories from API
        this.categories = ['All', ...categories.map(cat => cat.strCategory)];
        this.loading = false;
        // Load meals for first category
        this.loadRandomMeals();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.error = 'Failed to load categories';
        this.loading = false;
      }
    });
  }

  loadRandomMeals() {
    this.loading = true;
    this.mealService.getRandomMeals(12).subscribe({
      next: (meals) => {
        this.menuItems = meals.map(meal => this.mealService.convertToMenuItem(meal));
        this.loading = false;
      },
      error: (error) => {
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
        next: (meals) => {
          // Get detailed info for each meal to have complete data
          const mealPromises = meals.slice(0, 12).map(meal => 
            this.mealService.getMealById(meal.idMeal).toPromise()
              .then(detailedMeal => {
                if (detailedMeal) {
                  return this.mealService.convertToMenuItem(detailedMeal);
                }
                throw new Error('No meal data found');
              })
          );
          
          Promise.all(mealPromises).then(items => {
            this.menuItems = items;
            this.loading = false;
          }).catch(error => {
            console.error('Error loading detailed meals:', error);
            this.error = 'Failed to load detailed meal information';
            this.loading = false;
          });
        },
        error: (error) => {
          console.error('Error loading category meals:', error);
          this.error = 'Failed to load category items';
          this.loading = false;
        }
      });
    }
  }

  getFilteredItems(): MenuItem[] {
    if (this.selectedCategory === 'All') {
      return this.menuItems;
    }
    return this.menuItems.filter(item => item.category === this.selectedCategory);
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

  getTotalItems(): number {
    return this.menuItems.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  getTotalPrice(): number {
    return this.menuItems.reduce((total, item) => total + ((item.quantity || 0) * item.price), 0);
  }

  // Helper method to get display name for categories
  getCategoryDisplayName(category: string): string {
    const displayNames: { [key: string]: string } = {
      'All': '🍽️ All Items',
      'Beef': '🥩 Beef Dishes',
      'Chicken': '🍗 Chicken Delights',
      'Dessert': '🍰 Sweet Desserts',
      'Lamb': '🐑 Lamb Specialties', 
      'Miscellaneous': '⭐ Chef\'s Special',
      'Pasta': '🍝 Pasta Corner',
      'Pork': '🐷 Pork Dishes',
      'Seafood': '🐟 Fresh Seafood',
      'Side': '🥗 Side Orders',
      'Starter': '🥙 Appetizers',
      'Vegan': '🌱 Vegan Delights',
      'Vegetarian': '🥬 Vegetarian',
      'Breakfast': '🌅 Breakfast Menu',
      'Goat': '🐐 Goat Curry'
    };
    
    return displayNames[category] || category;
  }
}
