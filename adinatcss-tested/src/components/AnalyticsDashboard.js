import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';

const AnalyticsDashboard = ({ user, onClose }) => {
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadAnalytics();
  }, []);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      // Load conversations
      const conversationsResponse = await fetch(`http://localhost:3001/api/conversations/${user.uid}?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conversationsData = await conversationsResponse.json();
      
      if (conversationsData.success) {
        const convs = conversationsData.conversations;
        // Sort conversations by start time (newest first) on the client side
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
    } finally {
      setLoading(false);
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

  const callsByDay = getCallsByDay();
  const maxCalls = Math.max(...callsByDay.map(day => day.calls), 1);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">📊 Call Analytics Dashboard</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.totalCalls}</div>
              <div className="text-sm text-blue-800">Total Calls</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.callsToday}</div>
              <div className="text-sm text-green-800">Calls Today</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics.callsThisWeek}</div>
              <div className="text-sm text-purple-800">This Week</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{formatDuration(analytics.avgDuration)}</div>
              <div className="text-sm text-orange-800">Avg Duration</div>
            </div>
          </div>

          {/* Call Volume Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Call Volume (Last 7 Days)</h3>
            <div className="flex items-end space-x-2 h-40">
              {callsByDay.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="bg-blue-500 w-full rounded-t"
                    style={{ 
                      height: `${(day.calls / maxCalls) * 120}px`,
                      minHeight: day.calls > 0 ? '4px' : '0px'
                    }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    <div className="font-medium">{day.calls}</div>
                    <div>{day.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversations List and Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Conversations List */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📞 Recent Conversations</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No conversations yet. Your AI will start learning from incoming calls!
                  </div>
                ) : (
                  conversations.map(conversation => (
                    <div 
                      key={conversation.id} 
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatPhoneNumber(conversation.callerNumber)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(conversation.startTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDuration(conversation.duration || 0)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {conversation.messages?.length || 0} messages
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {conversation.messages?.[0]?.content?.slice(0, 60)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Conversation Details */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">💬 Conversation Details</h3>
              </div>
              <div className="p-4">
                {selectedConversation ? (
                  <div>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">
                          Call from {formatPhoneNumber(selectedConversation.callerNumber)}
                        </h4>
                        <button
                          onClick={() => analyzeConversation(selectedConversation.id)}
                          disabled={summaryLoading}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {summaryLoading ? 'Analyzing...' : '🔍 Analyze'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedConversation.startTime).toLocaleString()} • 
                        Duration: {formatDuration(selectedConversation.duration || 0)}
                      </p>
                    </div>

                    {/* AI Summary */}
                    {callSummary && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="font-medium text-yellow-800 mb-2">📋 AI Summary</h5>
                        <p className="text-sm text-yellow-700">{callSummary}</p>
                      </div>
                    )}

                    {/* Transcript */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      <h5 className="font-medium text-gray-900">📝 Transcript</h5>
                      {selectedConversation.messages?.map((message, index) => (
                        <div key={index} className={`p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-50 border-l-4 border-blue-400' 
                            : 'bg-gray-50 border-l-4 border-gray-400'
                        }`}>
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            {message.role === 'user' ? '👤 Caller' : '🤖 AI Assistant'}
                          </div>
                          <div className="text-sm text-gray-800">{message.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Select a conversation to view details and transcript
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 