# Transportation Management System (TMS) - Angular 21 Application

## Overview

This Transportation Management System is a modern front-end application built with **Angular 21** using the latest standalone component architecture, signals, and control flow syntax. The system allows customers to view their orders, request quotes for new shipments, and manage existing orders with multiple stops and moves.

## Angular 21 Features Used

This application showcases modern Angular 21 features:

### **Standalone Components**
- No NgModules required - all components are standalone
- Direct imports of dependencies in component decorators
- Simplified architecture and better tree-shaking

### **Signals**
- Reactive state management using Angular Signals
- `signal()` for creating reactive state
- `.set()` and `.update()` for modifying state
- Automatic change detection optimization

### **New Control Flow Syntax**
- `@if` instead of `*ngIf`
- `@for` with `track` instead of `*ngFor`
- `@else` for conditional rendering
- Improved performance and type safety

### **Standalone Routing**
- `app.routes.ts` instead of routing modules
- `provideRouter()` in app config
- Simplified route configuration

### **Modern TypeScript**
- TypeScript 5.7.2
- ES2022 target
- Strict mode enabled
- Enhanced type safety

## Key Features

### 1. **Order Management**
- View a list of all orders for the logged-in customer
- Orders are displayed in a sortable table with key information
- Click on any order to view detailed information
- Update existing orders by adding or removing moves

### 2. **Quote Generation**
- Request quotes for new shipments by entering origin and destination zip codes
- System automatically calculates optimal routing through CSX terminals
- Each quote includes:
  - Origin pickup to nearest CSX terminal
  - Terminal-to-terminal transportation
  - Final delivery from destination terminal to customer location
- Accept quotes to create new orders
- Reject quotes to create missed opportunity records

### 3. **Move Management**
- Each order consists of one or more moves
- Each move has an origin stop and a destination stop
- Add new moves to existing orders
- Remove moves from orders (minimum 1 move required)
- Edit move details including zip codes and addresses

### 4. **CSX Terminal Routing**
The system uses intelligent terminal routing based on zip code proximity:
- **Northeast Terminal** (10001) - Serves zip codes under 20000
- **Southeast Terminal** (30301) - Serves zip codes 20000-39999
- **Midwest Terminal** (60601) - Serves zip codes 40000-64999
- **Southwest Terminal** (75201) - Serves zip codes 65000-79999
- **West Terminal** (90001) - Serves zip codes 80000+

## Application Structure

### Order Workflow
1. Customer views existing orders on the default page
2. Customer clicks "Get New Quote" button
3. Customer enters origin and destination zip codes
4. System generates a quote with 3 moves:
   - Move 1: Origin location → Nearest origin terminal
   - Move 2: Origin terminal → Destination terminal
   - Move 3: Destination terminal → Final destination
5. Customer accepts or rejects the quote:
   - **Accept**: Order is created and added to order list
   - **Reject**: Missed opportunity is recorded

### Order Details
- View complete order information
- See all moves with origin and destination details
- Add additional moves to the order
- Remove unnecessary moves (must keep at least 1)
- Update move information (zip codes and addresses)
- Save changes to update the order

## Data Models

### Order
```typescript
{
  id: string;              // Unique order identifier
  customerId: string;      // Customer identifier
  status: string;          // Order status (Active, Completed)
  createdDate: string;     // ISO date string
  totalPrice: number;      // Total order price in USD
  moves: Move[];           // Array of moves
}
```

### Move
```typescript
{
  id: string;              // Unique move identifier
  origin: Stop;            // Origin stop details
  destination: Stop;       // Destination stop details
}
```

### Stop
```typescript
{
  zip: string;             // Zip code
  address: string;         // Full address or location name
}
```

### Quote
```typescript
{
  moves: Move[];           // Array of moves for the quote
  price: string;           // Total quoted price
}
```

## Mock API Functions

All API calls are currently mocked for development and testing:

- **mockGetOrders(customerId)** - Retrieve orders for a customer
- **mockCreateQuote(originZip, destinationZip)** - Generate a quote
- **mockCreateOrder(quote)** - Create a new order from accepted quote
- **mockCreateMissedOpportunity(quote)** - Record a rejected quote
- **mockUpdateOrder(orderId, updatedMoves)** - Update an existing order
- **findClosestTerminal(zip)** - Find nearest CSX terminal by zip code
- **calculatePrice(moves)** - Calculate total price for moves

## Running the Application

### Prerequisites
- **Node.js** v18.19 or higher (v20+ recommended)
- **npm** 9+ or **yarn** package manager
- **Angular CLI** 21.0 or higher

### Installation Steps

1. **Install Angular CLI globally**
   ```bash
   npm install -g @angular/cli@21
   ```

2. **Create a new Angular 21 project**
   ```bash
   ng new tms-app --routing --style=css
   cd tms-app
   ```
   
   When prompted:
   - Would you like to add Angular routing? **Yes**
   - Which stylesheet format would you like to use? **CSS**

3. **Install Tailwind CSS**
   ```bash
   npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
   npx tailwindcss init
   ```

4. **Configure Tailwind CSS**
   
   Update `tailwind.config.js`:
   ```javascript
   module.exports = {
     content: [
       "./src/**/*.{html,ts}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```
   
   Update `src/styles.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. **Create the folder structure**
   ```bash
   mkdir -p src/app/models
   mkdir -p src/app/services
   mkdir -p src/app/components/order-list
   mkdir -p src/app/components/order-detail
   mkdir -p src/app/components/quote-form
   mkdir -p src/app/components/quote-review
   ```

6. **Copy/Replace the provided code files**
   
   Angular 21 creates these files by default - **REPLACE** their contents:
   - ✏️ **REPLACE** `src/app/app.ts`
   - ✏️ **REPLACE** `src/app/app.html`
   - ✏️ **REPLACE** `src/app/app.scss` (keep it or leave empty)
   - ✏️ **REPLACE** `src/app/app.config.ts` 
   - ✏️ **REPLACE** `src/app/app.routes.ts`
   - ✏️ **REPLACE** `src/main.ts`
   
   **CREATE** these new files (copy from artifacts):
   
   **Models:**
   - ➕ `src/app/models/order.model.ts`
   
   **Services:**
   - ➕ `src/app/services/order.service.ts`
   - ➕ `src/app/services/quote.service.ts`
   
   **Components:** (Create all .ts, .html, and .scss files)
   - ➕ `src/app/components/order-list/order-list.component.ts`
   - ➕ `src/app/components/order-list/order-list.component.html`
   - ➕ `src/app/components/order-list/order-list.component.scss`
   - ➕ `src/app/components/order-detail/order-detail.component.ts`
   - ➕ `src/app/components/order-detail/order-detail.component.html`
   - ➕ `src/app/components/order-detail/order-detail.component.scss`
   - ➕ `src/app/components/quote-form/quote-form.component.ts`
   - ➕ `src/app/components/quote-form/quote-form.component.html`
   - ➕ `src/app/components/quote-form/quote-form.component.scss`
   - ➕ `src/app/components/quote-review/quote-review.component.ts`
   - ➕ `src/app/components/quote-review/quote-review.component.html`
   - ➕ `src/app/components/quote-review/quote-review.component.scss`

7. **Install dependencies**
   ```bash
   npm install
   ```

8. **Run the development server**
   ```bash
   ng serve
   ```
   
   Or with auto-open browser:
   ```bash
   ng serve --open
   ```

9. **Access the application**
   - Open your browser to `http://localhost:4200`
   - The application will automatically reload when you make changes

### Build for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
tms-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── order-list/
│   │   │   │   ├── order-list.component.ts
│   │   │   │   ├── order-list.component.html
│   │   │   │   └── order-list.component.scss
│   │   │   ├── order-detail/
│   │   │   │   ├── order-detail.component.ts
│   │   │   │   ├── order-detail.component.html
│   │   │   │   └── order-detail.component.scss
│   │   │   ├── quote-form/
│   │   │   │   ├── quote-form.component.ts
│   │   │   │   ├── quote-form.component.html
│   │   │   │   └── quote-form.component.scss
│   │   │   └── quote-review/
│   │   │       ├── quote-review.component.ts
│   │   │       ├── quote-review.component.html
│   │   │       └── quote-review.component.scss
│   │   ├── models/
│   │   │   └── order.model.ts
│   │   ├── services/
│   │   │   ├── order.service.ts
│   │   │   └── quote.service.ts
│   │   ├── app.routes.ts
│   │   ├── app.config.ts
│   │   ├── app.ts (main component)
│   │   ├── app.html (template)
│   │   └── app.scss (styles)
│   ├── main.ts
│   └── styles.css (or styles.scss)
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Future Enhancements

### Backend Integration
When ready to integrate with a real backend API:

1. Replace mock functions in services with HTTP calls
2. Use Angular's HttpClient for API communication
3. Add authentication and authorization
4. Implement error handling and retry logic
5. Add loading states and error messages

### Additional Features
- Filter and search orders
- Export orders to PDF or CSV
- Track order status in real-time
- Add cost breakdown for each move
- Implement user authentication
- Add order history and audit trail
- Support for multiple customer accounts
- Real-time pricing based on distance and fuel costs
- Integration with mapping services for route visualization
- Email notifications for quotes and order updates

## Testing

### Unit Tests
Run unit tests with:
```bash
ng test
```

### End-to-End Tests
Run e2e tests with:
```bash
ng e2e
```

## Code Examples

### Using Signals for State Management

```typescript
// Creating signals
orders = signal<Order[]>([]);
loading = signal(false);

// Reading signal values
if (this.loading()) { ... }

// Setting signal values
this.loading.set(true);
this.orders.set(newOrders);

// Updating signal values
this.orders.update(current => [...current, newOrder]);
```

### New Control Flow in Templates

```html
<!-- Conditional rendering -->
@if (loading()) {
  <div>Loading...</div>
} @else {
  <div>Content loaded</div>
}

<!-- Looping with track -->
@for (order of orders(); track order.id) {
  <div>{{ order.id }}</div>
}
```

### Standalone Component Structure

```typescript
@Component({
  selector: 'app-order-list',
  imports: [CommonModule, FormsModule], // Direct imports, no NgModule needed
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss' // Note: styleUrl (singular) in Angular 21
})
export class OrderListComponent { ... }
```

**Important Note:** Angular 21 uses `styleUrl` (singular) instead of `styleUrls` (plural) in the component decorator.

## Support

For questions or issues, please contact the development team or refer to the Angular documentation at https://angular.io/docs

## License

Copyright © 2025 Transportation Management System. All rights reserved.