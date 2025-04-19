#!/bin/bash

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create database
echo "Creating database..."
python -c "
from app import app, db
with app.app_context():
    db.create_all()
"

echo "Setup complete! Run 'python app.py' to start the application." 