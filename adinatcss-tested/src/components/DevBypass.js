import React, { useState } from 'react';

const DevBypass = ({ user, onPhoneAssigned, onComplete }) => {
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(false);

  const devOptions = [
    {
      id: 'skip-phone',
      title: 'Skip Phone Setup',
      description: 'Skip phone number assignment and go directly to AI training',
      action: () => {
        const mockData = {
          userId: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          phoneNumber: '+1555DEV1234',
          voiceAgentConfig: {
            name: 'AI Receptionist',
            greeting: `Hello! You've reached ${user.displayName || 'our office'}. How can I help you today?`,
            businessHours: '9:00 AM - 5:00 PM',
            enabled: true
          },
          devMode: true,
          skipReason: 'dev-bypass'
        };
        onPhoneAssigned(mockData);
      }
    },
    {
      id: 'mock-phone',
      title: 'Mock Phone Assignment',
      description: 'Simulate successful phone number assignment with mock data',
      action: async () => {
        setLoading(true);
        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const mockData = {
            userId: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            phoneNumber: '+1555MOCK789',
            voiceAgentConfig: {
              name: 'AI Receptionist',
              greeting: `Hello! You've reached ${user.displayName || 'our office'}. How can I help you today?`,
              businessHours: '9:00 AM - 5:00 PM',
              enabled: true
            },
            devMode: true,
            mockAssignment: true,
            assignedAt: new Date().toISOString()
          };
          
          onPhoneAssigned(mockData);
        } finally {
          setLoading(false);
        }
      }
    },
    {
      id: 'complete-setup',
      title: 'Skip Entire Setup',
      description: 'Mark setup as complete and go directly to dashboard',
      action: () => {
        const mockData = {
          userId: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          phoneNumber: '+1555COMPLETE456',
          voiceAgentConfig: {
            name: 'AI Receptionist',
            greeting: `Hello! You've reached ${user.displayName || 'our office'}. How can I help you today?`,
            businessHours: '9:00 AM - 5:00 PM',
            enabled: true
          },
          setupCompleted: true,
          setupCompletedAt: new Date().toISOString(),
          devMode: true,
          completeBypass: true
        };
        onComplete(mockData);
      }
    }
  ];

  const handleOptionSelect = async (option) => {
    setSelectedOption(option.id);
    setLoading(true);
    
    try {
      await option.action();
    } catch (error) {
      console.error('Dev bypass error:', error);
      alert('Error in dev bypass: ' + error.message);
    } finally {
      setLoading(false);
      setSelectedOption('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-purple-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <span className="mr-3">🛠️</span>
                Development Bypass Panel
              </h1>
              <p className="text-purple-100 mt-1">Skip steps for testing and development</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-purple-500 text-white text-sm rounded-full font-medium">
                DEV MODE
              </span>
              {user?.photoURL ? (
                <img className="h-8 w-8 rounded-full" src={user.photoURL} alt={user.displayName} />
              ) : (
                <div className="h-8 w-8 rounded-full bg-purple-400 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-purple-100">{user?.displayName || user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Info Banner */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-amber-800">Development Mode Active</h3>
              <p className="text-sm text-amber-700 mt-1">
                This page allows you to bypass setup steps for testing. Use these options to quickly test different parts of the application without going through the full setup process.
              </p>
            </div>
          </div>
        </div>

        {/* Current Issue Explanation */}
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-3">Current Issue Detected</h3>
          <p className="text-red-700 mb-3">
            Phone number assignment is failing because Twilio requires a publicly accessible webhook URL, 
            but we're using <code className="bg-red-100 px-2 py-1 rounded">localhost:3001</code> which Twilio cannot reach.
          </p>
          <p className="text-red-600 text-sm">
            <strong>Error:</strong> "VoiceUrl is not valid: http://localhost:3001/api/voice-webhook"
          </p>
          <p className="text-red-600 text-sm mt-2">
            <strong>Solution:</strong> Use the bypass options below, or set up ngrok for public webhook access.
          </p>
        </div>

        {/* Bypass Options */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Development Bypass Option</h2>
          
          {devOptions.map((option) => (
            <div key={option.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                  <p className="text-gray-600 mb-4">{option.description}</p>
                </div>
                <button
                  onClick={() => handleOptionSelect(option)}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                    loading && selectedOption === option.id
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
                  }`}
                >
                  {loading && selectedOption === option.id ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Use This Option'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Technical Info */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 Technical Information</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Backend API:</strong> http://localhost:3001 (Running ✅)</p>
            <p><strong>Frontend:</strong> http://localhost:3000 (Running ✅)</p>
            <p><strong>Issue:</strong> Twilio webhook URL validation failed</p>
            <p><strong>Twilio Status:</strong> Connected but requires public webhook URL</p>
            <p><strong>Firebase Status:</strong> Connected ✅</p>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700">
              <strong>To fix permanently:</strong> Install and run <code>ngrok http 3001</code> to create a public tunnel to your local server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevBypass;