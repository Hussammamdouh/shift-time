'use client';

import { useState, useEffect } from 'react';
import type { Snapshot } from '../lib/types';
import { useAuth } from '../lib/auth';

interface OnboardingFlowProps {
  snap: Snapshot;
  setSnap: (s: Snapshot) => void;
}

export default function OnboardingFlow({ snap, setSnap }: OnboardingFlowProps) {
  const { userProfile, isAdmin } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding if not completed
    if (!snap.onboardingCompleted && userProfile) {
      setShowOnboarding(true);
    }
  }, [snap.onboardingCompleted, userProfile]);

  const completeOnboarding = () => {
    setSnap({
      ...snap,
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  if (!showOnboarding || snap.onboardingCompleted) return null;

  const adminSteps = [
    {
      title: 'Welcome to Shift Manager! 👋',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            As an admin, you can manage your company, add employees, and track everyone&apos;s time.
          </p>
          <div className="space-y-2">
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <svg className="w-5 h-5 text-violet-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div>
                <p className="font-medium text-slate-200">Dashboard</p>
                <p className="text-sm text-slate-400">View all employees, their status, and earnings</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div>
                <p className="font-medium text-slate-200">Add Employees</p>
                <p className="text-sm text-slate-400">Create accounts for your team members</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-slate-200">Track Time</p>
                <p className="text-sm text-slate-400">Use the stopwatch to track your work hours</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Track Your Time ⏱️',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Start tracking your work hours using the stopwatch:
          </p>
          <ol className="space-y-3 list-decimal list-inside text-slate-300">
            <li>Click &quot;Start&quot; to begin tracking</li>
            <li>Click &quot;Break&quot; when taking breaks</li>
            <li>Click &quot;End&quot; when done with your shift</li>
            <li>Add notes and tags for better organization</li>
          </ol>
          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              💡 Tip: Set your hourly rate in Settings to calculate earnings automatically
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Manage Projects & Tasks 📋',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Organize your time by projects and tasks:
          </p>
          <ol className="space-y-3 list-decimal list-inside text-slate-300">
            <li>Go to Settings → Projects</li>
            <li>Create projects with colors for easy identification</li>
            <li>Add tasks to each project</li>
            <li>Assign shifts to projects when tracking time</li>
          </ol>
          <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <p className="text-sm text-purple-300">
              💡 This helps you see how much time you spend on each project
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'View Reports & Analytics 📊',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Get insights into your work patterns:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• View all your shifts with detailed statistics</li>
            <li>• See weekly and monthly trends</li>
            <li>• Track earnings and overtime</li>
            <li>• Filter and search through your history</li>
            <li>• Export data to CSV</li>
          </ul>
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-300">
              💡 Use filters to analyze specific time periods or projects
            </p>
          </div>
        </div>
      ),
    },
  ];

  const employeeSteps = [
    {
      title: 'Welcome to Shift Manager! 👋',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            You&apos;ve been added to the company. Let&apos;s get you started tracking your time!
          </p>
          <div className="space-y-2">
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-slate-200">Track Your Time</p>
                <p className="text-sm text-slate-400">Use the stopwatch to track your work hours</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <svg className="w-5 h-5 text-violet-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div>
                <p className="font-medium text-slate-200">View Reports</p>
                <p className="text-sm text-slate-400">Check your shift history and statistics</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <svg className="w-5 h-5 text-cyan-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <p className="font-medium text-slate-200">Manage Profile</p>
                <p className="text-sm text-slate-400">Update your name and change password</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'How to Track Your Time ⏱️',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Follow these simple steps:
          </p>
          <ol className="space-y-3 list-decimal list-inside text-slate-300">
            <li>Go to the &quot;Stopwatch Dashboard&quot; tab</li>
            <li>Click &quot;Start&quot; when you begin work</li>
            <li>Click &quot;Break&quot; when taking a break</li>
            <li>Click &quot;Back&quot; to return from break</li>
            <li>Click &quot;End&quot; when you finish your shift</li>
          </ol>
          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              💡 Breaks are automatically excluded from your working time
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Review Your Shifts 📋',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Check your work history:
          </p>
          <ul className="space-y-2 text-slate-300">
            <li>• Go to the &quot;Reports &amp; Analytics&quot; tab</li>
            <li>• See all your recorded shifts</li>
            <li>• View total hours, breaks, and overtime</li>
            <li>• Add notes and tags for organization</li>
          </ul>
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-300">
              💡 Your admin can see your dashboard to track your progress
            </p>
          </div>
        </div>
      ),
    },
  ];

  const steps = isAdmin ? adminSteps : employeeSteps;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="card max-w-2xl w-full animate-in fade-in-scale duration-300">
        <div className="relative">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={skipOnboarding}
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                Skip Tour
              </button>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-violet-600 to-cyan-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-200 mb-4">
              {steps[currentStep].title}
            </h2>
            <div className="text-slate-300">
              {steps[currentStep].content}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn btn-ghost disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex space-x-2">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep ? 'bg-violet-500' : 'bg-slate-600'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {isLastStep ? (
              <button
                onClick={completeOnboarding}
                className="btn btn-primary"
              >
                Get Started
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="btn btn-primary"
              >
                Next
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

