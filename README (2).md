# 🚀 TaskFlow — Team Task Manager

A full-stack team task management web application that helps teams collaborate efficiently by managing projects, assigning tasks, and tracking progress in real-time.

🔗 **Live Demo:** http://taskflow-kco6.onrender.com  
📂 **GitHub Repo:** https://github.com/SupratimBajpai8081/Task-Flow  

---

## 📌 About the Project

TaskFlow is designed to simplify team collaboration by replacing scattered communication (chats/spreadsheets) with a centralized workspace.

It provides:
- Role-based access control (Admin & Members)
- Task assignment & tracking system
- Visual Kanban board
- Real-time project insights dashboard

Inspired by tools like Trello and Asana, TaskFlow focuses on simplicity, performance, and clean UI.

---

## ⚙️ Tech Stack

### 🔹 Backend
- Flask
- SQLAlchemy
- Flask-JWT-Extended
- bcrypt

### 🔹 Frontend
- HTML, CSS, JavaScript (Vanilla)
- Tailwind CSS

### 🔹 Database
- MySQL

### 🔹 Deployment
- Render
- GitHub

---

## ✨ Features

### 🔐 Authentication
- Secure JWT-based login & signup
- Password hashing using bcrypt

### 📁 Project Management
- Create & manage projects
- Admin automatically assigned to creator
- Invite members via email

### ✅ Task Management
- Assign tasks with:
  - Priority levels
  - Due dates
  - Status tracking
- Members only see their assigned tasks

### 📊 Dashboard
- Task completion rate
- Overdue tasks tracking
- Per-member workload insights

### 📌 Kanban Board
- To Do → In Progress → Done
- Visual workflow tracking

### 🔒 Security
- Role-based access control enforced at API level
- Input validation on all endpoints
- CORS protection

---

## 🏗️ Project Structure
taskflow/
│
├── app.py # Entry point — runs the Flask app
│
├── backend/
│ ├── init.py # App factory & configuration
│ ├── models.py # Database models (User, Project, Task, etc.)
│ │
│ └── routes/
│ ├── auth.py # Authentication APIs (login/signup)
│ ├── projects.py # Project management APIs
│ ├── tasks.py # Task CRUD operations
│ ├── dashboard.py # Dashboard analytics APIs
│ └── frontend.py # Serves SPA frontend
│
├── frontend/
│ ├── templates/
│ │ └── index.html # Main HTML file (SPA root)
│ │
│ └── static/
│ ├── css/
│ │ └── main.css # Styling (dark theme)
│ │
│ └── js/
│ └── app.js # Frontend logic (routing, API calls)
│
├── requirements.txt # Python dependencies
├── Procfile # Deployment config (Gunicorn)
├── railway.toml # Deployment settings
└── .env.example # Environment variables template

---

## 🧠 Skills Demonstrated

### 💻 Backend Development
- REST API design with Flask Blueprints  
- JWT Authentication & Authorization  
- Secure password storage (bcrypt)  
- Role-based access control  

### 🎨 Frontend Development
- Single Page Application (SPA)  
- Client-side routing  
- Dynamic DOM rendering  
- Token-based API communication  

### 🗄️ Database Design
- Normalized schema  
- Many-to-many relationships  
- Foreign keys & cascading deletes  

### ☁️ Deployment
- Production deployment on Render  
- Gunicorn WSGI server setup  
- Environment variable management  

---
