from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import pytz
from dateutil import parser
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pizza_orders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Constants
TIMEZONE = pytz.timezone('Africa/Johannesburg')
DEFAULT_PREP_TIME = 15  # Default preparation time in minutes

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    prep_time = db.Column(db.Integer, default=DEFAULT_PREP_TIME)
    due_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='On Time')
    completed = db.Column(db.Boolean, default=False)
    customer_name = db.Column(db.String(100))
    order_details = db.Column(db.Text)

    def __repr__(self):
        return f'<Order {self.id}>'

    def calculate_due_time(self):
        # Ensure timestamp is timezone-aware and in Johannesburg time
        if self.timestamp.tzinfo is None:
            self.timestamp = TIMEZONE.localize(self.timestamp)
        else:
            self.timestamp = self.timestamp.astimezone(TIMEZONE)
        
        self.due_time = self.timestamp + timedelta(minutes=self.prep_time)
        return self.due_time

    def update_status(self):
        now = datetime.now(TIMEZONE)
        
        # Ensure due_time is timezone-aware and in Johannesburg time
        if self.due_time.tzinfo is None:
            self.due_time = TIMEZONE.localize(self.due_time)
        else:
            self.due_time = self.due_time.astimezone(TIMEZONE)
            
        if self.completed:
            self.status = 'Completed'
        else:
            time_diff = (self.due_time - now).total_seconds() / 60
            if time_diff < 0:
                self.status = 'Late'
            elif time_diff <= 5:
                self.status = 'Due Soon'
            else:
                self.status = 'On Time'
        return self.status

@app.route('/')
def index():
    try:
        logger.debug("Loading orders from database")
        orders = Order.query.order_by(Order.due_time).all()
        logger.debug(f"Found {len(orders)} orders")
        for order in orders:
            order.update_status()
        return render_template('index.html', orders=orders, TIMEZONE=TIMEZONE)
    except Exception as e:
        logger.error(f"Error loading orders: {str(e)}")
        return f"Error loading orders: {str(e)}", 500

@app.route('/submit')
def submit_order():
    """Route for the order submission page"""
    try:
        logger.debug("Loading order submission page")
        return render_template('submit_order.html')
    except Exception as e:
        logger.error(f"Error loading order submission page: {str(e)}")
        return f"Error loading order submission page: {str(e)}", 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.json
        logger.debug(f"Creating new order with data: {data}")
        
        # Parse timestamp and ensure it's in Johannesburg time
        timestamp = parser.parse(data['timestamp'])
        if timestamp.tzinfo is None:
            timestamp = TIMEZONE.localize(timestamp)
        else:
            timestamp = timestamp.astimezone(TIMEZONE)
            
        prep_time = int(data.get('prep_time', DEFAULT_PREP_TIME))
        
        order = Order(
            timestamp=timestamp,
            prep_time=prep_time,
            customer_name=data.get('customer_name', ''),
            order_details=data.get('order_details', '')
        )
        order.calculate_due_time()
        order.update_status()
        
        db.session.add(order)
        db.session.commit()
        logger.debug(f"Created new order with ID: {order.id}")
        
        return jsonify({
            'id': order.id,
            'timestamp': order.timestamp.isoformat(),
            'due_time': order.due_time.isoformat(),
            'status': order.status
        })
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    try:
        logger.debug(f"Updating order {order_id}")
        order = Order.query.get_or_404(order_id)
        data = request.json
        
        if 'completed' in data:
            order.completed = data['completed']
        if 'prep_time' in data:
            order.prep_time = int(data['prep_time'])
            order.calculate_due_time()
        
        order.update_status()
        db.session.commit()
        logger.debug(f"Updated order {order_id}")
        
        return jsonify({
            'id': order.id,
            'timestamp': order.timestamp.isoformat(),
            'due_time': order.due_time.isoformat(),
            'status': order.status,
            'completed': order.completed
        })
    except Exception as e:
        logger.error(f"Error updating order {order_id}: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders', methods=['GET'])
def get_orders():
    try:
        logger.debug("Getting all orders")
        orders = Order.query.order_by(Order.due_time).all()
        for order in orders:
            order.update_status()
        return jsonify([{
            'id': order.id,
            'timestamp': order.timestamp.isoformat(),
            'due_time': order.due_time.isoformat(),
            'status': order.status,
            'completed': order.completed,
            'customer_name': order.customer_name,
            'order_details': order.order_details
        } for order in orders])
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/archive', methods=['POST'])
def archive_orders():
    try:
        logger.debug("Archiving old orders")
        yesterday = datetime.now(TIMEZONE) - timedelta(days=1)
        old_orders = Order.query.filter(Order.timestamp < yesterday).all()
        
        for order in old_orders:
            db.session.delete(order)
        
        db.session.commit()
        logger.debug(f"Archived {len(old_orders)} orders")
        return jsonify({'archived': len(old_orders)})
    except Exception as e:
        logger.error(f"Error archiving orders: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Pizza Order Management System")
    with app.app_context():
        logger.info("Creating database tables")
        db.create_all()
    logger.info("Starting Flask application on port 5001")
    app.run(debug=False, host='0.0.0.0', port=5001) 