from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .. import db
from ..models import Task, ProjectMember, Project

tasks_bp = Blueprint('tasks', __name__)


def get_role(project_id, user_id):
    m = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
    return m.role if m else None


@tasks_bp.route('', methods=['GET'])
@jwt_required()
def get_my_tasks():
    user_id = int(get_jwt_identity())
    memberships = ProjectMember.query.filter_by(user_id=user_id).all()
    project_ids = [m.project_id for m in memberships]

    status = request.args.get('status')
    priority = request.args.get('priority')

    query = Task.query.filter(Task.project_id.in_(project_ids))
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)

    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify({'tasks': [t.to_dict() for t in tasks]}), 200


@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    if not get_role(task.project_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    return jsonify({'task': task.to_dict()}), 200


@tasks_bp.route('', methods=['POST'])
@jwt_required()
def create_task():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    project_id = data.get('project_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    priority = data.get('priority', 'medium')
    due_date_str = data.get('due_date')
    assignee_id = data.get('assignee_id')

    if not title:
        return jsonify({'error': 'Task title is required'}), 400
    if not project_id:
        return jsonify({'error': 'Project is required'}), 400

    role = get_role(project_id, user_id)
    if not role:
        return jsonify({'error': 'Access denied'}), 403

    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str)
        except ValueError:
            try:
                due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid due date format'}), 400

    task = Task(
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
        project_id=project_id,
        assignee_id=assignee_id,
        creator_id=user_id,
        status='todo'
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'task': task.to_dict()}), 201


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    role = get_role(task.project_id, user_id)

    if not role:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()

    # Members can only update status of their assigned tasks
    if role == 'member' and task.assignee_id != user_id:
        return jsonify({'error': 'You can only update your own assigned tasks'}), 403

    if role == 'admin':
        task.title = data.get('title', task.title).strip() or task.title
        task.description = data.get('description', task.description)
        task.priority = data.get('priority', task.priority)
        task.assignee_id = data.get('assignee_id', task.assignee_id)
        due_date_str = data.get('due_date')
        if due_date_str is not None:
            if due_date_str:
                try:
                    task.due_date = datetime.fromisoformat(due_date_str)
                except ValueError:
                    task.due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
            else:
                task.due_date = None

    if 'status' in data:
        task.status = data['status']

    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'task': task.to_dict()}), 200


@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    if get_role(task.project_id, user_id) != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200
