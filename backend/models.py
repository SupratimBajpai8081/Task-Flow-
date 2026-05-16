from datetime import datetime
from . import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_color = db.Column(db.String(20), default='#6366f1')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    memberships = db.relationship('ProjectMember', back_populates='user', cascade='all, delete-orphan')
    assigned_tasks = db.relationship('Task', foreign_keys='Task.assignee_id', back_populates='assignee')
    created_tasks = db.relationship('Task', foreign_keys='Task.creator_id', back_populates='creator')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar_color': self.avatar_color,
            'created_at': self.created_at.isoformat()
        }


class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(20), default='#6366f1')
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', foreign_keys=[creator_id])
    members = db.relationship('ProjectMember', back_populates='project', cascade='all, delete-orphan')
    tasks = db.relationship('Task', back_populates='project', cascade='all, delete-orphan')

    def to_dict(self, user_id=None):
        role = None
        if user_id:
            m = ProjectMember.query.filter_by(project_id=self.id, user_id=user_id).first()
            role = m.role if m else None
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'creator_id': self.creator_id,
            'creator_name': self.creator.name if self.creator else '',
            'member_count': len(self.members),
            'task_count': len(self.tasks),
            'role': role,
            'created_at': self.created_at.isoformat()
        }


class ProjectMember(db.Model):
    __tablename__ = 'project_members'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member')  # 'admin' or 'member'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    project = db.relationship('Project', back_populates='members')
    user = db.relationship('User', back_populates='memberships')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else '',
            'user_email': self.user.email if self.user else '',
            'avatar_color': self.user.avatar_color if self.user else '#6366f1',
            'role': self.role,
            'joined_at': self.joined_at.isoformat()
        }


class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(30), default='todo')  # todo, in_progress, done
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    due_date = db.Column(db.DateTime)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = db.relationship('Project', back_populates='tasks')
    assignee = db.relationship('User', foreign_keys=[assignee_id], back_populates='assigned_tasks')
    creator = db.relationship('User', foreign_keys=[creator_id], back_populates='created_tasks')

    def is_overdue(self):
        if self.due_date and self.status != 'done':
            return datetime.utcnow() > self.due_date
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else '',
            'project_color': self.project.color if self.project else '#6366f1',
            'assignee_id': self.assignee_id,
            'assignee_name': self.assignee.name if self.assignee else None,
            'assignee_color': self.assignee.avatar_color if self.assignee else None,
            'creator_id': self.creator_id,
            'creator_name': self.creator.name if self.creator else '',
            'is_overdue': self.is_overdue(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
