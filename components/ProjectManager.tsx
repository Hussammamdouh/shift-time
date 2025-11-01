'use client';

import { useState } from 'react';
import type { Project, Task, Snapshot } from '../lib/types';

interface ProjectManagerProps {
  snap: Snapshot;
  setSnap: (s: Snapshot) => void;
}

export default function ProjectManager({ snap, setSnap }: ProjectManagerProps) {
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8b5cf6', // Default violet
  });

  const projects = snap.projects || [];
  const tasks = snap.tasks || [];

  const handleCreateProject = () => {
    if (!formData.name.trim()) return;

    const newProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSnap({
      ...snap,
      projects: [...projects, newProject],
      updatedAt: Date.now(),
    });

    setFormData({ name: '', description: '', color: '#8b5cf6' });
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleUpdateProject = () => {
    if (!editingProject || !formData.name.trim()) return;

    setSnap({
      ...snap,
      projects: projects.map(p =>
        p.id === editingProject.id
          ? { ...p, name: formData.name, description: formData.description || undefined, color: formData.color, updatedAt: Date.now() }
          : p
      ),
      updatedAt: Date.now(),
    });

    setFormData({ name: '', description: '', color: '#8b5cf6' });
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleDeleteProject = (projectId: string) => {
    if (!confirm('Are you sure? This will also delete all tasks in this project.')) return;

    // Remove project and its tasks
    setSnap({
      ...snap,
      projects: projects.filter(p => p.id !== projectId),
      tasks: tasks.filter(t => t.projectId !== projectId),
      history: snap.history.map(shift => 
        shift.projectId === projectId ? { ...shift, projectId: undefined, taskId: undefined } : shift
      ),
      updatedAt: Date.now(),
    });
  };

  const handleCreateTask = () => {
    if (!formData.name.trim() || !selectedProjectId) return;

    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      projectId: selectedProjectId,
      name: formData.name,
      description: formData.description || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSnap({
      ...snap,
      tasks: [...tasks, newTask],
      updatedAt: Date.now(),
    });

    setFormData({ name: '', description: '', color: '#8b5cf6' });
    setSelectedProjectId('');
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleUpdateTask = () => {
    if (!editingTask || !formData.name.trim()) return;

    setSnap({
      ...snap,
      tasks: tasks.map(t =>
        t.id === editingTask.id
          ? { ...t, name: formData.name, description: formData.description || undefined, updatedAt: Date.now() }
          : t
      ),
      updatedAt: Date.now(),
    });

    setFormData({ name: '', description: '', color: '#8b5cf6' });
    setSelectedProjectId('');
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Are you sure? This will unassign the task from all shifts.')) return;

    setSnap({
      ...snap,
      tasks: tasks.filter(t => t.id !== taskId),
      history: snap.history.map(shift =>
        shift.taskId === taskId ? { ...shift, taskId: undefined } : shift
      ),
      updatedAt: Date.now(),
    });
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || '#8b5cf6',
    });
    setShowProjectForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedProjectId(task.projectId);
    setFormData({
      name: task.name,
      description: task.description || '',
      color: '#8b5cf6',
    });
    setShowTaskForm(true);
  };

  const getTasksForProject = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  const getShiftsForProject = (projectId: string) => {
    return snap.history.filter(s => s.projectId === projectId);
  };

  const getShiftsForTask = (taskId: string) => {
    return snap.history.filter(s => s.taskId === taskId);
  };

  return (
    <div className="space-y-6">
      {/* Projects Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-200">Projects</h3>
          <button
            onClick={() => {
              setShowProjectForm(!showProjectForm);
              setEditingProject(null);
              setFormData({ name: '', description: '', color: '#8b5cf6' });
            }}
            className="btn btn-primary btn-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showProjectForm ? 'Cancel' : 'New Project'}
          </button>
        </div>

        {showProjectForm && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-4">
            <div className="space-y-2">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Website Redesign"
              />
            </div>
            <div className="space-y-2">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="input"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description..."
              />
            </div>
            <div className="space-y-2">
              <label className="form-label">Color</label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="input flex-1"
                  placeholder="#8b5cf6"
                />
              </div>
            </div>
            <button
              onClick={editingProject ? handleUpdateProject : handleCreateProject}
              className="btn btn-primary w-full"
            >
              {editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No projects yet. Create your first project to start tracking time by project.</p>
            </div>
          ) : (
            projects.map(project => {
              const projectTasks = getTasksForProject(project.id);
              const projectShifts = getShiftsForProject(project.id);
              const projectHours = projectShifts.reduce((sum, s) => sum + s.netMs, 0) / 3600000;

              return (
                <div
                  key={project.id}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <h4 className="font-semibold text-slate-200">{project.name}</h4>
                        {project.description && (
                          <p className="text-sm text-slate-400">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="btn btn-ghost btn-sm"
                        title="Edit project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <span>{projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{projectShifts.length} shift{projectShifts.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{Math.round(projectHours * 10) / 10}h tracked</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tasks Section */}
      {projects.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-200">Tasks</h3>
            <button
              onClick={() => {
                setShowTaskForm(!showTaskForm);
                setEditingTask(null);
                setFormData({ name: '', description: '', color: '#8b5cf6' });
                setSelectedProjectId('');
              }}
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showTaskForm ? 'Cancel' : 'New Task'}
            </button>
          </div>

          {showTaskForm && (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-4">
              <div className="space-y-2">
                <label className="form-label">Project</label>
                <select
                  className="input"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="form-label">Task Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Design mockups"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                />
              </div>
              <button
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                disabled={!selectedProjectId || !formData.name.trim()}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No tasks yet. Create tasks to track time at a more granular level.</p>
              </div>
            ) : (
              tasks.map(task => {
                const taskProject = projects.find(p => p.id === task.projectId);
                const taskShifts = getShiftsForTask(task.id);
                const taskHours = taskShifts.reduce((sum, s) => sum + s.netMs, 0) / 3600000;

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {taskProject && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: taskProject.color }}
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-slate-200">{task.name}</h4>
                          {task.description && (
                            <p className="text-sm text-slate-400">{task.description}</p>
                          )}
                          {taskProject && (
                            <p className="text-xs text-slate-500 mt-1">
                              Project: {taskProject.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="btn btn-ghost btn-sm"
                          title="Edit task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="btn btn-danger btn-sm"
                          title="Delete task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span>{taskShifts.length} shift{taskShifts.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{Math.round(taskHours * 10) / 10}h tracked</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

