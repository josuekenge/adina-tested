import React, { useState } from 'react';
import { auth } from '../firebase';
import OnboardingSuccess from './OnboardingSuccess';

const AIOnboarding = ({ user, userData, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Simple training data - focused on essentials
  const [trainingData, setTrainingData] = useState({
    businessName: userData?.name || '',
    businessType: '',
    mainService: '',
    businessHours: '9:00 AM - 5:00 PM',
    greeting: '',
    commonQuestions: [
      { question: '', answer: '' },
      { question: '', answer: '' },
      { question: '', answer: '' }
    ]
  });

  const businessTypes = [
    'Restaurant', 'Medical Practice', 'Law Firm', 'Real Estate', 'Dental Office',
    'Hair Salon', 'Auto Repair', 'Consulting', 'Retail Store', 'Fitness Center',
    'Accounting', 'Insurance', 'Construction', 'Photography', 'Other'
  ];

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Format data for AI training
      const businessData = {
        businessName: trainingData.businessName,
        industry: trainingData.businessType,
        services: [{ 
          name: trainingData.mainService, 
          description: `Primary service offered by ${trainingData.businessName}` 
        }],
        faq: trainingData.commonQuestions.filter(q => q.question && q.answer),
        policies: [],
        customInstructions: `
Business Hours: ${trainingData.businessHours}
Business Type: ${trainingData.businessType}
Main Service: ${trainingData.mainService}

Always be professional, friendly, and helpful. If you don't know something specific, offer to take a message or transfer the call.
        `
      };

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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        console.error('Request URL:', apiUrl);
        console.error('Request headers:', {
          'Authorization': `Bearer ${token.substring(0, 20)}...`,
          'Content-Type': 'application/json'
        });
        throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const result = await response.json();
      if (result.success) {
                // Update greeting if provided
        if (trainingData.greeting) {
          const voiceApiUrl = process.env.NODE_ENV === 'development' 
            ? `http://localhost:3001/api/voice-config/${user.uid}`
            : `/api/voice-config/${user.uid}`;
            
          await fetch(voiceApiUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              voiceAgentConfig: {
                ...userData.voiceAgentConfig,
                greeting: trainingData.greeting,
                businessName: trainingData.businessName,
                businessHours: trainingData.businessHours
              }
            })
          });
        }
         setShowSuccess(true);
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

  const updateCommonQuestion = (index, field, value) => {
    const newQuestions = [...trainingData.commonQuestions];
    newQuestions[index][field] = value;
    setTrainingData(prev => ({ ...prev, commonQuestions: newQuestions }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return trainingData.businessName && trainingData.businessType;
      case 2:
        return trainingData.mainService;
      case 3:
        return trainingData.businessHours;
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  if (showSuccess) {
    return (
      <OnboardingSuccess 
        userData={userData}
        onContinue={onComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Let's Train Your AI Receptionist!
          </h1>
          <p className="text-gray-600">
            Just a few quick questions to make your AI sound perfect for your business
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of 4</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {/* Step 1: Business Basics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
                <p className="text-gray-600">This helps your AI introduce your business properly</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's your business name?
                </label>
                <input
                  type="text"
                  value={trainingData.businessName}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, businessName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="e.g., Smith Family Dental"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What type of business is it?
                </label>
                <select
                  value={trainingData.businessType}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, businessType: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="">Select your business type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Main Service */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your main service?</h2>
                <p className="text-gray-600">Your AI will know how to describe what you do</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your primary service in one sentence
                </label>
                <textarea
                  value={trainingData.mainService}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, mainService: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="e.g., We provide comprehensive dental care including cleanings, fillings, and cosmetic dentistry"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-blue-500">💡</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-900">Tip</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Keep it simple and clear. Your AI will use this to explain what you do to callers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Business Hours */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">When are you open?</h2>
                <p className="text-gray-600">Your AI will let callers know your business hours</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Hours
                </label>
                <input
                  type="text"
                  value={trainingData.businessHours}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, businessHours: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="e.g., Monday-Friday 9:00 AM - 5:00 PM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Greeting (Optional)
                </label>
                <textarea
                  value={trainingData.greeting}
                  onChange={(e) => setTrainingData(prev => ({ ...prev, greeting: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Hello! Thank you for calling ${trainingData.businessName}. How can I help you today?`}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave blank to use the default greeting
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Common Questions */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Common Questions (Optional)</h2>
                <p className="text-gray-600">Help your AI answer the questions you get most often</p>
              </div>
              
              {trainingData.commonQuestions.map((q, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateCommonQuestion(index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Common question ${index + 1} (e.g., "What are your prices?")`}
                    />
                    <textarea
                      value={q.answer}
                      onChange={(e) => updateCommonQuestion(index, 'answer', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="How should your AI respond?"
                    />
                  </div>
                </div>
              ))}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-green-500">✨</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-900">Almost Done!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your AI is ready to start taking calls. You can always add more training later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium"
            >
              Skip for now
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Training AI...
              </div>
            ) : currentStep === 4 ? (
              '🚀 Complete Setup'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIOnboarding; 