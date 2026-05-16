from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..models import Task, ProjectMember, User

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('', methods=['GET'])
@jwt_required()
def get_dashboard():
    user_id = int(get_jwt_identity())
    memberships = ProjectMember.query.filter_by(user_id=user_id).all()
    project_ids = [m.project_id for m in memberships]

    all_tasks = Task.query.filter(Task.project_id.in_(project_ids)).all()

    total = len(all_tasks)
    todo = sum(1 for t in all_tasks if t.status == 'todo')
    in_progress = sum(1 for t in all_tasks if t.status == 'in_progress')
    done = sum(1 for t in all_tasks if t.status == 'done')
    overdue = sum(1 for t in all_tasks if t.is_overdue())

    # Tasks per user across my projects
    user_task_map = {}
    for t in all_tasks:
        if t.assignee_id:
            if t.assignee_id not in user_task_map:
                user_task_map[t.assignee_id] = {
                    'user_id': t.assignee_id,
                    'user_name': t.assignee.name if t.assignee else 'Unknown',
                    'avatar_color': t.assignee.avatar_color if t.assignee else '#6366f1',
                    'count': 0
                }
            user_task_map[t.assignee_id]['count'] += 1

    tasks_per_user = sorted(user_task_map.values(), key=lambda x: x['count'], reverse=True)[:5]

    # Recent tasks
    recent_tasks = sorted(all_tasks, key=lambda t: t.created_at, reverse=True)[:5]

    # Overdue task list
    overdue_tasks = [t.to_dict() for t in all_tasks if t.is_overdue()][:5]

    return jsonify({
        'stats': {
            'total': total,
            'todo': todo,
            'in_progress': in_progress,
            'done': done,
            'overdue': overdue,
            'projects': len(project_ids)
        },
        'tasks_per_user': tasks_per_user,
        'recent_tasks': [t.to_dict() for t in recent_tasks],
        'overdue_tasks': overdue_tasks
    }), 200
