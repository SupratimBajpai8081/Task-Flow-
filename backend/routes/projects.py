from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models import Project, ProjectMember, User, Task

projects_bp = Blueprint('projects', __name__)

PROJECT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16']


def get_member_role(project_id, user_id):
    m = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
    return m.role if m else None


@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = int(get_jwt_identity())
    memberships = ProjectMember.query.filter_by(user_id=user_id).all()
    projects = [m.project.to_dict(user_id) for m in memberships if m.project]
    return jsonify({'projects': projects}), 200


@projects_bp.route('', methods=['POST'])
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    color = data.get('color', PROJECT_COLORS[0])

    if not name:
        return jsonify({'error': 'Project name is required'}), 400

    project = Project(name=name, description=description, color=color, creator_id=user_id)
    db.session.add(project)
    db.session.flush()

    member = ProjectMember(project_id=project.id, user_id=user_id, role='admin')
    db.session.add(member)
    db.session.commit()

    return jsonify({'project': project.to_dict(user_id)}), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if not get_member_role(project_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    return jsonify({'project': project.to_dict(user_id)}), 200


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if get_member_role(project_id, user_id) != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    project.name = data.get('name', project.name).strip()
    project.description = data.get('description', project.description)
    project.color = data.get('color', project.color)
    db.session.commit()
    return jsonify({'project': project.to_dict(user_id)}), 200


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if get_member_role(project_id, user_id) != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted'}), 200


@projects_bp.route('/<int:project_id>/members', methods=['GET'])
@jwt_required()
def get_members(project_id):
    user_id = int(get_jwt_identity())
    if not get_member_role(project_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    members = ProjectMember.query.filter_by(project_id=project_id).all()
    return jsonify({'members': [m.to_dict() for m in members]}), 200


@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
def add_member(project_id):
    user_id = int(get_jwt_identity())
    if get_member_role(project_id, user_id) != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    email = data.get('email', '').strip().lower()
    role = data.get('role', 'member')

    target = User.query.filter_by(email=email).first()
    if not target:
        return jsonify({'error': 'User not found with that email'}), 404
    if ProjectMember.query.filter_by(project_id=project_id, user_id=target.id).first():
        return jsonify({'error': 'User already a member'}), 409

    member = ProjectMember(project_id=project_id, user_id=target.id, role=role)
    db.session.add(member)
    db.session.commit()
    return jsonify({'member': member.to_dict()}), 201


@projects_bp.route('/<int:project_id>/members/<int:member_user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(project_id, member_user_id):
    user_id = int(get_jwt_identity())
    if get_member_role(project_id, user_id) != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    if member_user_id == user_id:
        return jsonify({'error': 'Cannot remove yourself'}), 400

    member = ProjectMember.query.filter_by(project_id=project_id, user_id=member_user_id).first()
    if not member:
        return jsonify({'error': 'Member not found'}), 404

    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Member removed'}), 200


@projects_bp.route('/<int:project_id>/tasks', methods=['GET'])
@jwt_required()
def get_project_tasks(project_id):
    user_id = int(get_jwt_identity())
    if not get_member_role(project_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    tasks = Task.query.filter_by(project_id=project_id).order_by(Task.created_at.desc()).all()
    return jsonify({'tasks': [t.to_dict() for t in tasks]}), 200
