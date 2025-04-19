from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import pytz
from dateutil import parser

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
        self.due_time = self.timestamp + timedelta(minutes=self.prep_time)
        return self.due_time

    def update_status(self):
        now = datetime.now(TIMEZONE)
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
    orders = Order.query.order_by(Order.due_time).all()
    for order in orders:
        order.update_status()
    return render_template('index.html', orders=orders)

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    timestamp = parser.parse(data['timestamp'])
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
    
    return jsonify({
        'id': order.id,
        'timestamp': order.timestamp.isoformat(),
        'due_time': order.due_time.isoformat(),
        'status': order.status
    })

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.json
    
    if 'completed' in data:
        order.completed = data['completed']
    if 'prep_time' in data:
        order.prep_time = int(data['prep_time'])
        order.calculate_due_time()
    
    order.update_status()
    db.session.commit()
    
    return jsonify({
        'id': order.id,
        'timestamp': order.timestamp.isoformat(),
        'due_time': order.due_time.isoformat(),
        'status': order.status,
        'completed': order.completed
    })

@app.route('/api/orders', methods=['GET'])
def get_orders():
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

@app.route('/api/orders/archive', methods=['POST'])
def archive_orders():
    yesterday = datetime.now(TIMEZONE) - timedelta(days=1)
    old_orders = Order.query.filter(Order.timestamp < yesterday).all()
    
    for order in old_orders:
        db.session.delete(order)
    
    db.session.commit()
    return jsonify({'archived': len(old_orders)})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True) 