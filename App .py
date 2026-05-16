import os
from backend import create_app

app = create_app()

if __name__ == '__main__':
    # Use the PORT variable provided by Render, default to 5000 for local dev
    port = int(os.environ.get("PORT", 5000))
    # In production, debug must be False. host must be 0.0.0.0
    app.run(host='0.0.0.0', port=port, debug=False)
