from flask import Blueprint, render_template

frontend_bp = Blueprint('frontend', __name__)


@frontend_bp.route('/')
@frontend_bp.route('/<path:path>')
def index(path=''):
    return render_template('index.html')
