import os
from flask import Flask
from urllib.parse import quote_plus
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app():
    # Define app and point to correct frontend folders
    app = Flask(__name__, 
                template_folder='../frontend/templates', 
                static_folder='../frontend/static')

    # --- Configuration ---
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'taskflow-secret-key-2024')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-taskflow-2024')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # --- Database Configuration ---
    db_url = os.environ.get('DATABASE_URL')
    
    if db_url:
        # 1. Fix driver prefix (SQLAlchemy requires mysql+pymysql)
        if db_url.startswith("mysql://"):
            db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
        
        # 2. Strip 'ssl-mode' query parameters
        # This prevents PyMySQL from throwing a TypeError on unexpected arguments
        if "?" in db_url:
            db_url = db_url.split("?")[0]
        
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url
        
        # 3. Secure connection for Production (Aiven/Render/AWS)
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            "connect_args": {
                "ssl": {
                    "ca": None  # Set path to CA cert if required by provider
                }
            },
            "pool_pre_ping": True,
            "pool_recycle": 280
        }
    else:
        # Local development fallback using individual env vars
        db_user = os.environ.get('DB_USER', 'root')
        db_pass = quote_plus(os.environ.get('DB_PASSWORD', 'Aryan@psit123'))
        db_host = os.environ.get('DB_HOST', '127.0.0.1')
        db_port = os.environ.get('DB_PORT', '3307')
        db_name = os.environ.get('DB_NAME', 'taskflow')
        
        app.config['SQLALCHEMY_DATABASE_URI'] = (
            f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
        )

    # --- Initialize Extensions ---
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    
    # CORS setup: Allow frontend to communicate with API
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # --- Register Blueprints ---
    from .routes.auth import auth_bp
    from .routes.projects import projects_bp
    from .routes.tasks import tasks_bp
    from .routes.dashboard import dashboard_bp
    from .routes.frontend import frontend_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(frontend_bp)

    # --- Database Initialization ---
    with app.app_context():
        try:
            db.create_all()
            print("Successfully verified/created database tables.")
        except Exception as e:
            print(f"Critical error during database table creation: {e}")

    return app
