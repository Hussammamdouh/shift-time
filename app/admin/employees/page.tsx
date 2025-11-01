'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import { PageLoader } from '@/components/LoadingSpinner';
import { getCompanyUsers } from '@/lib/dashboard';
import type { UserProfile } from '@/lib/auth';
import { deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function EmployeesContent() {
  const { createEmployee, company, userProfile } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const loadEmployees = async () => {
    if (!company) return;
    
    setLoading(true);
    try {
      const users = await getCompanyUsers(company.id);
      // Filter out the current admin
      const employeeList = users.filter(u => u.uid !== userProfile?.uid && u.role !== 'admin');
      setEmployees(employeeList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const adminEmail = await createEmployee(
        formData.email,
        formData.password,
        formData.displayName
      );
      
      setSuccess(`Employee ${formData.displayName} created successfully!`);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
      });
      setShowAddForm(false);
      
      // Reload employees
      await loadEmployees();
      
      // Redirect to login for admin re-authentication
      setTimeout(() => {
        router.push(`/auth/login?email=${encodeURIComponent(adminEmail)}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };

  const handleDelete = async (employee: UserProfile) => {
    if (!confirm(`Are you sure you want to delete ${employee.displayName || employee.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!db) throw new Error('Database not available');
      
      // Delete user profile
      await deleteDoc(doc(db, 'users', employee.uid));
      
      // Update company member count
      if (company) {
        await updateDoc(doc(db, 'companies', company.id), {
          memberCount: (company.memberCount || 1) - 1,
          updatedAt: serverTimestamp(),
        });
      }
      
      setSuccess(`Employee ${employee.displayName || employee.email} deleted successfully`);
      await loadEmployees();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    }
  };

  const handleEdit = (employee: UserProfile) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      password: '',
      confirmPassword: '',
      displayName: employee.displayName || '',
    });
    setShowAddForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !db) return;

    setError('');
    setSuccess('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      // Update user profile
      const updates: { displayName: string; updatedAt: ReturnType<typeof serverTimestamp> } = {
        displayName: formData.displayName,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', editingEmployee.uid), updates);

      setSuccess('Employee updated successfully!');
      setEditingEmployee(null);
      setShowAddForm(false);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
      });
      
      await loadEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return <PageLoader text="Loading employees..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Clean Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-glow pulse-glow">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text-animate ribbon truncate">
                  Employee Management
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-slate-400 hidden sm:block truncate">
                  {company?.name} • {employees.length} employee{employees.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingEmployee(null);
                  setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    displayName: '',
                  });
                }}
                className="p-2 sm:px-3 sm:py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline ml-2">{showAddForm ? 'Cancel' : 'Add Employee'}</span>
              </button>
              <Link 
                href="/dashboard" 
                className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-500/30 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline ml-2">Dashboard</span>
              </Link>
              <Link 
                href="/" 
                className="p-2 sm:px-3 sm:py-2 rounded-lg border border-violet-500/30 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline ml-2">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        {/* Add/Edit Employee Form */}
        {showAddForm && (
          <div className="card mb-8 animate-in slide-up duration-300">
            <h2 className="text-2xl font-bold text-slate-200 mb-6">
              {editingEmployee ? 'Edit Employee' : 'Create New Employee'}
            </h2>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm mb-6">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={editingEmployee ? handleUpdate : handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="displayName" className="form-label">
                  Full Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  className="input"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="employee@company.com"
                  disabled={!!editingEmployee}
                />
                {editingEmployee && (
                  <p className="text-xs text-slate-500">Email cannot be changed after creation</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="form-label">
                  {editingEmployee ? 'New Password (optional)' : 'Temporary Password'}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required={!editingEmployee}
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                  minLength={6}
                />
                <p className="text-xs text-slate-500">
                  {editingEmployee 
                    ? 'Leave blank to keep current password'
                    : 'Must be at least 6 characters. Employee can change this after first login.'}
                </p>
              </div>

              {(formData.password || !editingEmployee) && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required={!editingEmployee || !!formData.password}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEmployee(null);
                    setFormData({
                      email: '',
                      password: '',
                      confirmPassword: '',
                      displayName: '',
                    });
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees List */}
        <div className="card">
          <h2 className="text-2xl font-bold text-slate-200 mb-6">Employees</h2>

          {employees.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-slate-400 mb-4">No employees yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary"
              >
                Add Your First Employee
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div
                  key={employee.uid}
                  className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {(employee.displayName || employee.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-200">
                          {employee.displayName || employee.email}
                        </h3>
                        <p className="text-sm text-slate-400">{employee.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Joined {new Date(employee.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="btn btn-ghost btn-sm"
                        title="Edit employee"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(employee)}
                        className="btn btn-danger btn-sm"
                        title="Delete employee"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <AdminProtectedRoute>
      <EmployeesContent />
    </AdminProtectedRoute>
  );
}
