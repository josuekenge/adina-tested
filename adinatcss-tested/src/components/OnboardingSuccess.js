import React from 'react';

const OnboardingSuccess = ({ userData, onContinue }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Your AI Receptionist is Ready!
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Your AI has been trained and is now ready to handle calls professionally for your business.
        </p>

        {/* Phone Number Display */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your AI Phone Number</h2>
          <p className="text-2xl font-bold text-blue-600 mb-2">{userData?.phoneNumber}</p>
          <p className="text-sm text-gray-600">Callers can now reach your AI receptionist at this number</p>
        </div>

        {/* What's Next */}
        <div className="text-left mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Test your AI</p>
                <p className="text-sm text-gray-600">Call your number to hear how your AI sounds</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Share your number</p>
                <p className="text-sm text-gray-600">Add it to your website, business cards, and marketing</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Monitor & improve</p>
                <p className="text-sm text-gray-600">Check analytics and add more training as needed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-500">💡</span>
            </div>
            <div className="ml-3 text-left">
              <h4 className="text-sm font-medium text-yellow-900">Pro Tips</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Your AI learns from every call - check analytics regularly</li>
                <li>• You can always add more training in the dashboard</li>
                <li>• Test different greetings to see what works best</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.open(`tel:${userData?.phoneNumber}`, '_self')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-medium"
          >
            📞 Test Call Now
          </button>
          
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-medium"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-6">
          Need help? You can always retrain your AI or adjust settings from your dashboard.
        </p>
      </div>
    </div>
  );
};

export default OnboardingSuccess; 