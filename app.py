from flask import Flask, render_template, send_from_directory
import os

# Enable UTF-8 encoding for special characters (Gandi recommendation)
os.environ['LC_ALL'] = 'en_US.UTF-8'
os.environ['LC_LANG'] = 'en_US.UTF-8'

app = Flask(__name__, 
            static_folder='static',
            static_url_path='/static',
            template_folder='templates')

# Configuration
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # Cache static files for 1 year

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.static_folder, 'images'), 
                               'bridge-nobg.png', 
                               mimetype='image/png')

@app.errorhandler(404)
def not_found(e):
    return render_template('index.html'), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
