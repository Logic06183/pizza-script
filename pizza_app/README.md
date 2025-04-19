# Pizza Order Management System

A modern web application for managing pizza orders, tracking preparation times, and monitoring order statuses in real-time.

## Features

- Real-time order tracking
- Automatic status updates (On Time, Due Soon, Late, Completed)
- Order sorting by due time
- Clean, modern user interface
- Automatic archiving of old orders
- Mobile-responsive design

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

- **Creating a New Order**: Click the "New Order" button and fill in the order details
- **Updating Order Status**: Use the checkbox to mark orders as completed
- **Viewing Orders**: Orders are automatically sorted by due time
- **Order Status Colors**:
  - Green: On Time
  - Yellow: Due Soon
  - Red: Late
  - Gray: Completed

## Technical Details

- Built with Flask and SQLAlchemy
- Uses SQLite for data storage
- Real-time updates every minute
- Automatic timezone handling (Africa/Johannesburg)
- RESTful API for order management

## API Endpoints

- `GET /api/orders`: Get all orders
- `POST /api/orders`: Create a new order
- `PUT /api/orders/<id>`: Update an order
- `POST /api/orders/archive`: Archive old orders 