# Gandi Simple Hosting WSGI entry point
# This file must be named 'wsgi.py' and expose an 'application' object

import sys
import os

# Add project directory to path if needed
project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

# Import Flask app as 'application' (required by Gandi)
from app import app as application
