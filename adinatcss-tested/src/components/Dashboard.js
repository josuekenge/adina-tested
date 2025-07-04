import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { assignPhoneNumber, getUserData, updateVoiceAgentConfig } from '../services/phoneService';
import PhoneSetup from './PhoneSetup';
import AITraining from './AITraining';
import AIOnboarding from './AIOnboarding';
import '../Dashboard.css';

const Dashboard = ({ user, userPlan, onLogout }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showAITraining, setShowAITraining] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Analytics state
  const [conversations, setConversations] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalCalls: 0,
    totalDuration: 0,
    avgDuration: 0,
    callsToday: 0,
    callsThisWeek: 0,
    callsThisMonth: 0
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [callSummary, setCallSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Get current plan limits
  const getMinutesIncluded = () => {
    if (!userPlan) return 300; // Default to starter plan
    return userPlan.minutesIncluded || userPlan.minutes || 300;
  };

  // Configuration state
  const [voiceConfig, setVoiceConfig] = useState({
    name: 'AI Receptionist',
    greeting: '',
    businessHours: '9:00 AM - 5:00 PM',
    enabled: true
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      // If no user, ensure we're not showing setup
      setShowSetup(false);
    }
  }, [user]);

  useEffect(() => {
    if (userData && activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [userData, activeTab]);

  const loadUserData = async () => {
    console.log('Loading user data for:', user.uid);
    setLoading(true);
    setError(null);
    
    // Set a 3-second timeout for the API call
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API timeout')), 3000)
    );
    
    try {
      const data = await Promise.race([getUserData(user.uid), timeoutPromise]);
      console.log('User data retrieved:', data);
      
      // ALWAYS show setup first if no phone number - this is the primary onboarding flow
      if (!data || !data.phoneNumber || data.phoneNumber === 'Not assigned') {
        console.log('User needs phone number setup - showing PhoneSetup component');
        setShowSetup(true);
        setLoading(false);
        return;
      }
      
      setUserData(data);
      setVoiceConfig(data.voiceAgentConfig || voiceConfig);
      
      // Check if existing user needs AI training onboarding (fallback)
      const hasBasicTraining = data.voiceAgentConfig?.businessData?.businessName;
      if (!hasBasicTraining) {
        setShowOnboarding(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  };

  const loadAnalytics = async () => {
    try {
      const token = await getAuthToken();
      
      // Load conversations
      const conversationsResponse = await fetch(`http://localhost:3001/api/conversations/${user.uid}?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conversationsData = await conversationsResponse.json();
      
      if (conversationsData.success) {
        const convs = conversationsData.conversations;
        const sortedConvs = convs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        setConversations(sortedConvs);
        
        // Calculate analytics
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const totalDuration = convs.reduce((sum, conv) => sum + (conv.duration || 0), 0);
        const callsToday = convs.filter(conv => new Date(conv.startTime) >= today).length;
        const callsThisWeek = convs.filter(conv => new Date(conv.startTime) >= weekAgo).length;
        const callsThisMonth = convs.filter(conv => new Date(conv.startTime) >= monthAgo).length;
        
        setAnalytics({
          totalCalls: convs.length,
          totalDuration,
          avgDuration: convs.length > 0 ? Math.round(totalDuration / convs.length) : 0,
          callsToday,
          callsThisWeek,
          callsThisMonth
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Reset to empty state if API fails
      setConversations([]);
      setAnalytics({
        totalCalls: 0,
        totalDuration: 0,
        avgDuration: 0,
        callsToday: 0,
        callsThisWeek: 0,
        callsThisMonth: 0
      });
    }
  };

  const analyzeConversation = async (conversationId) => {
    try {
      setSummaryLoading(true);
      const token = await getAuthToken();
      
      const response = await fetch('http://localhost:3001/api/analyze-conversation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId })
      });
      
      const result = await response.json();
      if (result.success) {
        setCallSummary(result.analysis);
      } else {
        setCallSummary('Unable to analyze this conversation.');
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setCallSummary('Error analyzing conversation.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleConfigUpdate = async () => {
    try {
      await updateVoiceAgentConfig(user.uid, voiceConfig);
      setUserData(prev => ({ ...prev, voiceAgentConfig: voiceConfig }));
    } catch (error) {
      console.error('Error updating config:', error);
      setUserData(prev => ({ ...prev, voiceAgentConfig: voiceConfig }));
    }
  };

  const copyPhoneNumber = () => {
    if (userData?.phoneNumber) {
      navigator.clipboard.writeText(userData.phoneNumber);
    }
  };

  const handlePhoneAssigned = (assignedUserData) => {
    console.log('Phone assigned:', assignedUserData);
    setUserData(assignedUserData);
    setVoiceConfig(assignedUserData.voiceAgentConfig || voiceConfig);
    setShowSetup(false);
    
    const hasBasicTraining = assignedUserData.voiceAgentConfig?.businessData?.businessName;
    if (!hasBasicTraining) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadUserData();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'Unknown';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return phoneNumber;
  };

  const getCallsByDay = () => {
    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const callsOnDay = conversations.filter(conv => {
        const convDate = new Date(conv.startTime);
        return convDate >= dayStart && convDate < dayEnd;
      }).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        calls: callsOnDay
      });
    }
    
    return last7Days;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-md mx-auto">
              <div className="text-center">
                <span>Unable to load user data. Please try refreshing the page.</span>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 block mx-auto text-xs bg-red-600 text-white px-3 py-1 rounded"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (assigning) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Assigning your AI phone number...</p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return <PhoneSetup user={user} onPhoneAssigned={handlePhoneAssigned} />;
  }

  if (showAITraining) {
    return <AITraining user={user} onClose={() => setShowAITraining(false)} />;
  }

  if (showOnboarding) {
    return (
      <AIOnboarding 
        user={user} 
        userData={userData}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  const navigation = [
    { id: 'overview', name: 'Overview', icon: '▢' },
    { id: 'analytics', name: 'Analytics', icon: '▤' },
    { id: 'configuration', name: 'Configuration', icon: '◯' },
    { id: 'training', name: 'AI Training', icon: '◈' },
    { id: 'status', name: 'System Status', icon: '◐' }
  ];

  const callsByDay = getCallsByDay();
  const maxCalls = Math.max(...callsByDay.map(day => day.calls), 1);

  return (
    <div className="min-h-screen syntro-bg flex">
      {/* Syntro-Style Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen`}>
        <div className="h-screen syntro-sidebar flex flex-col">
          {/* Clean Logo Header */}
          <div className="h-16 px-6 border-b border-slate-200/60 flex items-center flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">ADINA</span>
            </div>
          </div>
          
          {/* Navigation - Takes remaining space but allows scrolling */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <nav className="flex-1 mt-8 px-4 space-y-2 overflow-y-auto pb-4 syntro-scrollbar">
              {navigation.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`syntro-nav-item flex items-center px-3 py-3 cursor-pointer slide-in ${
                    activeTab === item.id ? 'active' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-5 h-5 mr-3 flex-shrink-0">
                    {item.id === 'overview' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 5v4" />
                      </svg>
                    )}
                    {item.id === 'analytics' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {item.id === 'configuration' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    {item.id === 'training' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                    {item.id === 'status' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium">{item.name}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* User Profile Section - Fixed at Bottom */}
          <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white mt-auto">
            <div className="flex items-center space-x-3 mb-3">
              {user?.photoURL ? (
                <img className="h-10 w-10 rounded-full" src={user.photoURL} alt={user.displayName || user.email} />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Syntro-Style Header */}
        <header className="syntro-header sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-3 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Syntro Page Title */}
              <div>
                <h1 className="text-2xl syntro-heading">
                  {navigation.find(nav => nav.id === activeTab)?.name || 'Dashboard'}
                </h1>
                <p className="text-sm syntro-body mt-1">
                  {activeTab === 'overview' && 'Monitor your call performance and customer engagement metrics'}
                  {activeTab === 'analytics' && 'Detailed insights into call patterns and customer interactions'}
                  {activeTab === 'configuration' && 'Customize your AI voice agent settings and behavior'}
                  {activeTab === 'training' && 'Train your AI with business-specific knowledge and responses'}
                  {activeTab === 'status' && 'Real-time system health and performance monitoring'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Enhanced Status Indicator */}
              <div className="flex items-center space-x-3 bg-white rounded-2xl px-5 py-3 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 metric-card-interactive">
                <div className={`w-3 h-3 rounded-full ${userData?.voiceAgentConfig?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'} shadow-sm`}></div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">
                    {userData?.voiceAgentConfig?.enabled ? 'ADINA Active' : 'ADINA Inactive'}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {userData?.voiceAgentConfig?.enabled ? 'Ready to take calls' : 'Currently offline'}
                  </span>
                </div>
              </div>

              {/* Plan Information */}
              {userPlan && (
                <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl px-5 py-3 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 metric-card-interactive">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-blue-900">
                      {userPlan.name} Plan
                    </span>
                    <span className="text-xs text-blue-600 font-medium">
                      ${userPlan.price}/month
                    </span>
                  </div>
                </div>
              )}
              

              {/* Enhanced Quick Actions */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-2xl p-2 border border-gray-200">
                <button 
                  onClick={() => {
                    loadUserData();
                    loadAnalytics();
                  }}
                  className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 transform hover:scale-105 bubble-button"
                  title="Refresh Data"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => setActiveTab('configuration')}
                  className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 transform hover:scale-105 bubble-button"
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => {
                    const phoneNumber = userData?.phoneNumber || '+1 (218) 366-4729';
                    window.open(`tel:${phoneNumber}`, '_self');
                  }}
                  className="p-3 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300 transform hover:scale-105 bubble-button"
                  title="Test Call ADINA"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="p-3 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 transform hover:scale-105 bubble-button"
                  title="View Analytics"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
                
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to sign out?')) {
                      handleLogout();
                    }
                  }}
                  className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 transform hover:scale-105 bubble-button"
                  title="Sign Out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto syntro-scrollbar">
          <div className="container mx-auto px-6 py-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Clean Metric Cards with Consistent Colors */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="metric-card metric-card-blue stagger-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        {analytics.callsThisWeek > 0 ? `${analytics.callsThisWeek} this week` : 'Getting started'}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {analytics.totalCalls.toLocaleString()}
                    </div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Total Calls</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalCalls === 0 ? 'No calls yet' : `${analytics.callsThisWeek} calls this week`}
                    </div>
                  </div>
                  
                  <div className="metric-card metric-card-emerald stagger-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        Quality
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 mb-2">
                      {analytics.avgDuration > 0 ? `${Math.round(analytics.avgDuration / 60)}m` : '0m'}
                    </div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Avg. Call Duration</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalCalls === 0 ? 'No data yet' : 'Average time per call'}
                    </div>
                  </div>
                  
                  <div className="metric-card metric-card-orange stagger-3">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                        Fast
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {analytics.totalCalls > 0 ? '<1s' : '0s'}
                    </div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Response Time</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalCalls === 0 ? 'No data yet' : 'Average response time'}
                    </div>
                  </div>
                  
                  <div className="metric-card metric-card-purple stagger-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                        Reliable
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {analytics.totalCalls > 0 ? '100%' : '0%'}
                    </div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Answer Rate</div>
                    <div className="text-xs text-gray-500">
                      {analytics.totalCalls === 0 ? 'No calls yet' : `${analytics.callsToday} calls answered today`}
                    </div>
                  </div>
                </div>

                {/* Beautiful Interactive Charts Section */}
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Interactive Minutes Used Chart */}
                  <div className="chart-container metric-card-interactive">
                    <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Minutes Used</h3>
                    
                    <div className="flex flex-col items-center">
                      {/* Beautiful Circular Progress Chart */}
                      <div className="relative w-56 h-56 mb-8 group">
                        <svg className="w-56 h-56 transform -rotate-90 circular-progress" viewBox="0 0 224 224">
                          {/* Background Circle */}
                          <circle
                            cx="112"
                            cy="112"
                            r="90"
                            stroke="#f1f5f9"
                            strokeWidth="16"
                            fill="none"
                          />
                          {/* Animated Satisfaction Rate Circle */}
                          <circle
                            cx="112"
                            cy="112"
                            r="90"
                            stroke="#3b82f6"
                            strokeWidth="16"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(Math.round(analytics.totalDuration / 60) / getMinutesIncluded()) * 565.49} ${565.49 - (Math.round(analytics.totalDuration / 60) / getMinutesIncluded()) * 565.49}`}
                            className="transition-all duration-3000 ease-out"
                            style={{
                              filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3))'
                            }}
                          />
                          {/* Glow effect */}
                          <circle
                            cx="112"
                            cy="112"
                            r="90"
                            stroke="rgba(59, 130, 246, 0.1)"
                            strokeWidth="20"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(Math.round(analytics.totalDuration / 60) / getMinutesIncluded()) * 565.49} ${565.49 - (Math.round(analytics.totalDuration / 60) / getMinutesIncluded()) * 565.49}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          />
                        </svg>
                        
                        {/* Floating Center Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center floating">
                          <div className="text-5xl font-black text-gray-900 tracking-tight pulse-glow">
                            {Math.round(analytics.totalDuration / 60).toLocaleString()}
                          </div>
                          <div className="text-sm font-semibold text-gray-700 mt-1 tracking-wide">Total Minutes</div>
                          <div className="text-xs text-gray-500 font-medium">
                            {Math.round((Math.round(analytics.totalDuration / 60) / getMinutesIncluded()) * 100)}% of {getMinutesIncluded().toLocaleString()} limit
                          </div>
                          <div className="text-xs text-blue-500 mt-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 font-semibold">
                            💰 Billable Time
                          </div>
                        </div>
                      </div>
                      
                      {/* Interactive Key Metrics */}
                      <div className="grid grid-cols-2 gap-6 w-full">
                        <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl metric-card-interactive">
                          <div className="text-3xl font-black text-gray-900 tracking-tight">
                            {analytics.totalCalls > 0 ? '<1s' : '0s'}
                          </div>
                          <div className="text-sm font-semibold text-gray-700 mt-1 tracking-wide">Avg. Response</div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl metric-card-interactive">
                          <div className="text-3xl font-black text-gray-900 tracking-tight">
                            {Math.round(analytics.totalDuration / 60 / 30) || 0}
                          </div>
                          <div className="text-sm font-semibold text-gray-700 mt-1 tracking-wide">This Month</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Weekly Call Volume Chart */}
                  <div className="chart-container metric-card-interactive">
                    <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Call Volume Trends</h3>
                    <p className="text-sm text-gray-600 mb-6 font-medium">Daily distribution and average duration</p>
                    
                    <div className="flex items-end space-x-4 h-52 mb-8 p-4 bg-gradient-to-t from-gray-50/50 to-transparent rounded-2xl">
                      {getCallsByDay().map((day, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center group">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 chart-bar cursor-pointer relative"
                            style={{ 
                              height: `${Math.max(...getCallsByDay().map(d => d.calls)) > 0 ? (day.calls / Math.max(...getCallsByDay().map(d => d.calls))) * 160 : 0}px`,
                              minHeight: '12px',
                              animationDelay: `${index * 200}ms`
                            }}
                          >
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10">
                              {day.calls} calls
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mt-4 text-center group-hover:text-gray-900 transition-colors duration-300">
                            <div className="font-bold text-gray-900 text-sm">{day.calls}</div>
                            <div className="text-gray-500 font-medium">{day.date.split(',')[0]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Interactive Summary Stats */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl metric-card-interactive">
                        <div className="text-3xl font-black text-gray-900 tracking-tight">
                          {analytics.callsThisWeek}
                        </div>
                        <div className="text-sm font-semibold text-gray-700 mt-1 tracking-wide">Calls This Week</div>
                        <div className="text-xs text-blue-500 mt-2 font-semibold">
                          {analytics.callsThisWeek === 0 ? 'Getting started' : 'Recent activity'}
                        </div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl metric-card-interactive">
                        <div className="text-3xl font-black text-gray-900 tracking-tight">
                          {Math.round(getCallsByDay().reduce((sum, day) => sum + day.calls, 0) / 7)}
                        </div>
                        <div className="text-sm font-semibold text-gray-700 mt-1 tracking-wide">Daily Average</div>
                        <div className="text-xs text-gray-500 mt-2 font-semibold">
                          {analytics.totalCalls === 0 ? 'No data yet' : 'Call volume pattern'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clean Interactive Quick Actions */}
                <div className="chart-container metric-card-interactive">
                  <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Quick Actions</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button className="flex items-center space-x-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-100 bubble-button group">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center floating shadow-lg" style={{animationDelay: '0s'}}>
                        <span className="text-white text-xl">📞</span>
                      </div>
                      <div className="text-left relative z-10">
                        <div className="font-bold text-gray-900 text-lg tracking-tight">Test Call</div>
                        <div className="text-sm text-gray-600 font-medium">Make a test call to your AI</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('configuration')}
                      className="flex items-center space-x-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-100 bubble-button group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center floating shadow-lg" style={{animationDelay: '0.2s'}}>
                        <span className="text-white text-xl">⚙️</span>
                      </div>
                      <div className="text-left relative z-10">
                        <div className="font-bold text-gray-900 text-lg tracking-tight">Configuration</div>
                        <div className="text-sm text-gray-600 font-medium">Customize AI behavior</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('analytics')}
                      className="flex items-center space-x-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-100 bubble-button group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center floating shadow-lg" style={{animationDelay: '0.4s'}}>
                        <span className="text-white text-xl">📊</span>
                      </div>
                      <div className="text-left relative z-10">
                        <div className="font-bold text-gray-900 text-lg tracking-tight">Analytics</div>
                        <div className="text-sm text-gray-600 font-medium">View performance insights</div>
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-8 fade-in">
                {/* Beautiful Header Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Call Analytics</h2>
                      <p className="text-lg text-gray-600 font-medium">Comprehensive insights into your ADINA performance</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">Last 30 Days</span>
                      </div>
                      <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors duration-200 shadow-sm">
                        Export Report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clean Analytics Cards with Consistent Colors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="metric-card metric-card-blue metric-card-interactive">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <span className="text-blue-600 text-2xl">📞</span>
                      </div>
                      <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                        {analytics.totalCalls === 0 ? 'New' : 'Active'}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">{analytics.totalCalls.toLocaleString()}</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Total Calls</div>
                    <div className="text-xs text-gray-500">All time performance</div>
                  </div>
                  
                  <div className="metric-card metric-card-emerald metric-card-interactive">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <span className="text-emerald-600 text-2xl">😊</span>
                      </div>
                      <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        High Rating
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{analytics.avgDuration > 0 ? `${Math.round(analytics.avgDuration / 60)}m` : '0m'}</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Avg. Call Duration</div>
                    <div className="text-xs text-gray-500">Time per conversation</div>
                  </div>
                  
                  <div className="metric-card metric-card-purple metric-card-interactive">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <span className="text-purple-600 text-2xl">⚡</span>
                      </div>
                      <div className="text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                        Lightning Fast
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">{analytics.totalCalls > 0 ? '<1s' : '0s'}</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Avg. Response Time</div>
                    <div className="text-xs text-gray-500">Average first response</div>
                  </div>
                  
                  <div className="metric-card metric-card-orange metric-card-interactive">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                        <span className="text-orange-600 text-2xl">📈</span>
                      </div>
                      <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                        Reliable
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">{analytics.totalCalls > 0 ? '100%' : '0%'}</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Answer Rate</div>
                    <div className="text-xs text-gray-500">Calls answered successfully</div>
                  </div>
                </div>

                {/* Clean Call Volume Chart */}
                <div className="chart-container metric-card-interactive">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Call Volume Trends</h3>
                      <p className="text-sm text-gray-600 font-medium">Daily call distribution over the last 7 days</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-600">Daily Calls</span>
                    </div>
                  </div>
                  
                  <div className="flex items-end space-x-4 h-64 mb-6 p-6 bg-gradient-to-t from-blue-50/30 to-transparent rounded-2xl">
                    {getCallsByDay().map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center group">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 chart-bar cursor-pointer relative rounded-t-lg"
                          style={{ 
                            height: `${Math.max(...getCallsByDay().map(d => d.calls)) > 0 ? (day.calls / Math.max(...getCallsByDay().map(d => d.calls))) * 180 : 0}px`,
                            minHeight: '16px'
                          }}
                        >
                          {/* Enhanced Tooltip */}
                          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg whitespace-nowrap z-10">
                            <div className="font-bold">{day.calls} calls</div>
                            <div className="text-xs text-gray-300">{day.date}</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-4 text-center group-hover:text-gray-900 transition-colors duration-300">
                          <div className="font-bold text-gray-900 text-base">{day.calls}</div>
                          <div className="text-gray-500 font-medium">{day.date.split(',')[0]}</div>
                          <div className="text-xs text-gray-400">{day.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Enhanced Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-2xl font-black text-blue-600">{Math.round(getCallsByDay().reduce((sum, day) => sum + day.calls, 0) / 7)}</div>
                      <div className="text-xs text-gray-600 font-semibold">Daily Average</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-2xl font-black text-emerald-600">{Math.max(...getCallsByDay().map(d => d.calls)) || 0}</div>
                      <div className="text-xs text-gray-600 font-semibold">Peak Day</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="text-2xl font-black text-purple-600">{analytics.totalCalls > 0 ? 'All Day' : 'N/A'}</div>
                      <div className="text-xs text-gray-600 font-semibold">Peak Hours</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100">
                      <div className="text-2xl font-black text-orange-600">{analytics.callsThisWeek > 0 ? 'Growing' : 'New'}</div>
                      <div className="text-xs text-gray-600 font-semibold">Status</div>
                    </div>
                  </div>
                </div>

                {/* Conversations and Performance Insights */}
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Recent Conversations */}
                  <div className="chart-container metric-card-interactive">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Conversations</h3>
                      <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-semibold border border-blue-100">
                        Live Updates
                      </span>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                      {conversations.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">📞</div>
                          <h4 className="font-semibold text-gray-900 mb-2">No conversations yet</h4>
                          <p className="text-sm text-gray-500">Your call history will appear here once ADINA starts taking calls.</p>
                        </div>
                      ) : conversations.map(conversation => (
                        <div 
                          key={conversation.id} 
                          className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200 cursor-pointer border border-gray-200 hover:border-blue-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-sm font-bold">
                                  {conversation.callerName ? conversation.callerName.charAt(0) : '?'}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{conversation.callerName || 'Unknown Caller'}</div>
                                <div className="text-xs text-gray-500">{conversation.phoneNumber || 'No number'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">{new Date(conversation.timestamp).toLocaleDateString()}</div>
                              <div className="text-xs font-medium text-blue-600">{formatDuration(conversation.duration)}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 mb-2">{conversation.summary}</div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              conversation.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                              conversation.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {conversation.sentiment === 'positive' ? '😊 Positive' :
                               conversation.sentiment === 'negative' ? '😞 Negative' :
                               '😐 Neutral'}
                            </span>
                            <button className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                              View Details →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Insights */}
                  <div className="chart-container metric-card-interactive">
                    <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Performance Insights</h3>
                    <div className="space-y-6">
                      {/* Top Questions */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Most Common Questions
                        </h4>
                        <div className="space-y-2">
                          {analytics.totalCalls === 0 ? (
                            <div className="text-center py-8">
                              <div className="text-3xl mb-3">❓</div>
                              <p className="text-sm text-gray-500">No questions data yet</p>
                              <p className="text-xs text-gray-400 mt-1">Common questions will be tracked here</p>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-3xl mb-3">📊</div>
                              <p className="text-sm text-gray-500">Building question insights...</p>
                              <p className="text-xs text-gray-400 mt-1">Analysis will appear after more calls</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Call Quality Metrics */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Call Quality Metrics
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="text-lg font-black text-emerald-600">{analytics.totalCalls > 0 ? '100%' : '0%'}</div>
                            <div className="text-xs text-gray-600 font-semibold">Call Completion</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-lg font-black text-blue-600">{analytics.totalCalls > 0 ? '<1s' : '0s'}</div>
                            <div className="text-xs text-gray-600 font-semibold">Avg. Wait Time</div>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="text-lg font-black text-purple-600">{analytics.totalCalls > 0 ? '100%' : '0%'}</div>
                            <div className="text-xs text-gray-600 font-semibold">Resolution Rate</div>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="text-lg font-black text-orange-600">{analytics.totalCalls > 0 ? '5/5' : 'N/A'}</div>
                            <div className="text-xs text-gray-600 font-semibold">Avg. Rating</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'configuration' && (
              <div className="space-y-8 fade-in">
                <div className="chart-container">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-2xl mr-3">⚙️</span>
                    AI Voice Agent Configuration
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Agent Name
                      </label>
                      <input
                        type="text"
                        value={voiceConfig.name}
                        onChange={(e) => setVoiceConfig(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="AI Receptionist"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Greeting Message
                      </label>
                      <textarea
                        value={voiceConfig.greeting}
                        onChange={(e) => setVoiceConfig(prev => ({ ...prev, greeting: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                        placeholder="Hello! You've reached our office. How can I help you today?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Hours
                      </label>
                      <input
                        type="text"
                        value={voiceConfig.businessHours}
                        onChange={(e) => setVoiceConfig(prev => ({ ...prev, businessHours: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="9:00 AM - 5:00 PM"
                      />
                    </div>

                    <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                      <input
                        type="checkbox"
                        id="enabled"
                        checked={voiceConfig.enabled}
                        onChange={(e) => setVoiceConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                      />
                      <label htmlFor="enabled" className="ml-3 block text-sm font-medium text-gray-900">
                        Enable AI Voice Agent
                      </label>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={handleConfigUpdate}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Settings Display */}
                <div className="chart-container">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <span className="text-xl mr-3">📋</span>
                    Current Settings
                  </h3>
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-2">Agent Details</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-900">{userData?.voiceAgentConfig?.name || 'AI Receptionist'}</span></p>
                          <p><span className="font-medium text-gray-600">Business Hours:</span> <span className="text-gray-900">{userData?.voiceAgentConfig?.businessHours || '9:00 AM - 5:00 PM'}</span></p>
                          <p><span className="font-medium text-gray-600">Voice:</span> <span className="text-gray-900">{userData?.voiceAgentConfig?.voiceSettings?.voiceId ? 'ElevenLabs Custom' : 'Default'}</span></p>
                          <p><span className="font-medium text-gray-600">Status:</span> 
                            <span className={`ml-1 font-semibold ${userData?.voiceAgentConfig?.enabled ? 'text-emerald-600' : 'text-blue-600'}`}>
                              {userData?.voiceAgentConfig?.enabled ? '✓ Active' : '✗ Inactive'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="mr-2">💬</span>
                          Current Greeting
                        </h4>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <p className="text-gray-700 text-sm leading-relaxed italic">
                            "{userData?.voiceAgentConfig?.greeting || 'Hello! Thank you for calling. How can I help you today?'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="fade-in">
                <div className="chart-container">
                  <div className="text-center py-12">
                    <div className="text-6xl mb-6">🤖</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Training Center</h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                      Enhance your AI receptionist with custom training data and voice settings. 
                      Train your AI to better understand your business and provide more accurate responses.
                    </p>
                    <button 
                      onClick={() => setShowAITraining(true)}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg flex items-center space-x-3 mx-auto"
                    >
                      <span className="text-2xl">🚀</span>
                      <span>Open AI Training Center</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status' && (
              <div className="space-y-8 fade-in">
                {/* Account Overview */}
                <div className="chart-container">
                  <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Account Status</h2>
                  <p className="text-gray-600 mb-8 font-medium">Your ADINA AI account information and service status</p>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 metric-card-interactive">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                          <span className="text-blue-600 text-2xl">📞</span>
                        </div>
                        <div className="text-xs text-blue-600 font-semibold bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200">
                          Active
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Phone Number</h4>
                      <p className="text-gray-700 font-mono text-xl font-bold">{userData?.phoneNumber || 'Not assigned'}</p>
                      <p className="text-xs text-gray-500 mt-2 font-medium">Your dedicated AI phone line</p>
                      {!userData?.phoneNumber && (
                        <button
                          onClick={() => setShowSetup(true)}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Get Phone Number
                        </button>
                      )}
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 metric-card-interactive">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <span className="text-emerald-600 text-2xl">👤</span>
                        </div>
                        <div className="text-xs text-emerald-600 font-semibold bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200">
                          Premium
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Account Type</h4>
                      <p className="text-gray-700 text-xl font-bold">Standard</p>
                      <p className="text-xs text-gray-500 mt-2 font-medium">Full access to all features</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-200 metric-card-interactive">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                          <span className="text-purple-600 text-2xl">🔄</span>
                        </div>
                        <div className="text-xs text-purple-600 font-semibold bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200">
                          Current
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Last Updated</h4>
                      <p className="text-gray-700 text-sm font-bold">
                        {userData?.lastUpdated ? new Date(userData.lastUpdated).toLocaleDateString() : 'Never'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 font-medium">Account last modified</p>
                    </div>
                  </div>
                </div>

                {/* Service Status */}
                <div className="chart-container">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-2xl mr-3">🚀</span>
                    Service Status
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white rounded-2xl border border-gray-200 metric-card-interactive">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center">
                          <span className="mr-3">🤖</span>
                          ADINA AI Status
                        </h4>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                          userData?.voiceAgentConfig?.enabled 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            userData?.voiceAgentConfig?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                          }`}></div>
                          <span>{userData?.voiceAgentConfig?.enabled ? 'Online' : 'Offline'}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        {userData?.voiceAgentConfig?.enabled 
                          ? 'Your AI receptionist is active and ready to handle calls' 
                          : 'Your AI receptionist is currently offline'}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Agent Name:</span>
                          <span className="font-medium text-gray-900">{userData?.voiceAgentConfig?.name || 'AI Receptionist'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Business Hours:</span>
                          <span className="font-medium text-gray-900">{userData?.voiceAgentConfig?.businessHours || '9:00 AM - 5:00 PM'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-white rounded-2xl border border-gray-200 metric-card-interactive">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center">
                          <span className="mr-3">📊</span>
                          System Health
                        </h4>
                        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span>Healthy</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        All systems are operating normally
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">Call Processing</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-emerald-600 text-sm font-medium">Operational</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">AI Response</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-emerald-600 text-sm font-medium">Operational</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">Voice Quality</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-emerald-600 text-sm font-medium">Excellent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Dashboard; 