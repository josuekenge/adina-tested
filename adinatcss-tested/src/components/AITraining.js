import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';

const AITraining = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('training');
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState([]);
  const [conversations, setConversations] = useState([]);
  
  // Training data state
  const [businessData, setBusinessData] = useState({
    businessName: '',
    industry: '',
    services: [{ name: '', description: '' }],
    faq: [{ question: '', answer: '' }],
    policies: [{ title: '', description: '' }],
    customInstructions: ''
  });

  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState({
    voiceId: '',
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  });

  const [testText, setTestText] = useState('Hello! Thank you for calling our office. How can I help you today?');

  useEffect(() => {
    loadVoices();
    loadConversations();
  }, []);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  };

  const loadVoices = async () => {
    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3001/api/voices'
        : '/api/voices';
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setVoices(data.voices);
        if (data.voices.length > 0 && !voiceSettings.voiceId) {
          setVoiceSettings(prev => ({ ...prev, voiceId: data.voices[0].voice_id }));
        }
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3001/api/conversations/${user.uid}`
        : `/api/conversations/${user.uid}`;
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleTrainAI = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3001/api/train-ai/${user.uid}`
        : `/api/train-ai/${user.uid}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ businessData })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('AI training completed successfully!');
      } else {
        alert('Training failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error training AI:', error);
      alert('Training failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestVoice = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3001/api/test-voice'
        : '/api/test-voice';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          voiceId: voiceSettings.voiceId,
          voiceSettings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost
          }
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        alert('Voice test failed');
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      alert('Voice test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVoiceSettings = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3001/api/voice-config/${user.uid}`
        : `/api/voice-config/${user.uid}`;
      
      // Get current voice agent config first
      const currentConfigResponse = await fetch(
        process.env.NODE_ENV === 'development' 
          ? `http://localhost:3001/api/user-data/${user.uid}`
          : `/api/user-data/${user.uid}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const currentData = await currentConfigResponse.json();
      const currentVoiceConfig = currentData.data?.voiceAgentConfig || {};
      
      // Update with new voice settings
      const updatedVoiceConfig = {
        ...currentVoiceConfig,
        voiceSettings: voiceSettings
      };
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voiceAgentConfig: updatedVoiceConfig })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Voice settings saved successfully! Your AI will now use this voice for phone calls.');
      } else {
        alert('Failed to save voice settings: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving voice settings:', error);
      alert('Failed to save voice settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setBusinessData(prev => ({
      ...prev,
      services: [...prev.services, { name: '', description: '' }]
    }));
  };

  const addFAQ = () => {
    setBusinessData(prev => ({
      ...prev,
      faq: [...prev.faq, { question: '', answer: '' }]
    }));
  };

  const addPolicy = () => {
    setBusinessData(prev => ({
      ...prev,
      policies: [...prev.policies, { title: '', description: '' }]
    }));
  };

  const removeService = (index) => {
    setBusinessData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const removeFAQ = (index) => {
    setBusinessData(prev => ({
      ...prev,
      faq: prev.faq.filter((_, i) => i !== index)
    }));
  };

  const removePolicy = (index) => {
    setBusinessData(prev => ({
      ...prev,
      policies: prev.policies.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Training & Configuration</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="mt-6 flex space-x-8">
            <button
              onClick={() => setActiveTab('training')}
              className={`pb-2 text-sm font-medium border-b-2 ${
                activeTab === 'training'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📚 Business Training
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`pb-2 text-sm font-medium border-b-2 ${
                activeTab === 'voice'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🎤 Voice Settings
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-2 text-sm font-medium border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Analytics
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Training Tab */}
          {activeTab === 'training' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Your Business Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={businessData.industry}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Healthcare, Legal, Real Estate"
                  />
                </div>
              </div>

              {/* Services */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Services Offered
                  </label>
                  <button
                    onClick={addService}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add Service
                  </button>
                </div>
                {businessData.services.map((service, index) => (
                  <div key={index} className="grid md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => {
                        const newServices = [...businessData.services];
                        newServices[index].name = e.target.value;
                        setBusinessData(prev => ({ ...prev, services: newServices }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Service name"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...businessData.services];
                          newServices[index].description = e.target.value;
                          setBusinessData(prev => ({ ...prev, services: newServices }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Service description"
                      />
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Frequently Asked Questions
                  </label>
                  <button
                    onClick={addFAQ}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add FAQ
                  </button>
                </div>
                {businessData.faq.map((item, index) => (
                  <div key={index} className="space-y-2 mb-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => {
                          const newFAQ = [...businessData.faq];
                          newFAQ[index].question = e.target.value;
                          setBusinessData(prev => ({ ...prev, faq: newFAQ }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Question"
                      />
                      <button
                        onClick={() => removeFAQ(index)}
                        className="ml-2 text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const newFAQ = [...businessData.faq];
                        newFAQ[index].answer = e.target.value;
                        setBusinessData(prev => ({ ...prev, faq: newFAQ }));
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Answer"
                    />
                  </div>
                ))}
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions
                </label>
                <textarea
                  value={businessData.customInstructions}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, customInstructions: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Additional instructions for your AI receptionist..."
                />
              </div>

              <button
                onClick={handleTrainAI}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Training AI...' : '🚀 Train AI Receptionist'}
              </button>
            </div>
          )}

          {/* Voice Tab */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Voice
                </label>
                <select
                  value={voiceSettings.voiceId}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, voiceId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {voices.map(voice => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stability: {voiceSettings.stability}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={voiceSettings.stability}
                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Similarity Boost: {voiceSettings.similarity_boost}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={voiceSettings.similarity_boost}
                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, similarity_boost: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Text
                </label>
                <textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="mt-3 flex space-x-3">
                  <button
                    onClick={handleTestVoice}
                    disabled={loading}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : '🔊 Test Voice'}
                  </button>
                  <button
                    onClick={handleSaveVoiceSettings}
                    disabled={loading}
                    className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : '💾 Save Voice Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Conversations</h3>
              {conversations.length === 0 ? (
                <p className="text-gray-500">No conversations yet. Your AI will start learning from incoming calls!</p>
              ) : (
                <div className="space-y-4">
                  {conversations.map(conversation => (
                    <div key={conversation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">Call from {conversation.callerNumber}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(conversation.startTime).toLocaleString()} • 
                            Duration: {Math.floor(conversation.duration / 60)}m {conversation.duration % 60}s
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {conversation.messages?.slice(0, 4).map((message, index) => (
                          <div key={index} className={`text-sm ${
                            message.role === 'user' ? 'text-blue-600' : 'text-gray-700'
                          }`}>
                            <strong>{message.role === 'user' ? 'Caller' : 'AI'}:</strong> {message.content}
                          </div>
                        ))}
                        {conversation.messages?.length > 4 && (
                          <p className="text-sm text-gray-500">... and {conversation.messages.length - 4} more messages</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITraining; 