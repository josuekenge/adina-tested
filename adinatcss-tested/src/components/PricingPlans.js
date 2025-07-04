import React, { useState } from 'react';
import { redirectToCheckout } from '../services/stripeService';
import '../Dashboard.css';

const PricingPlans = ({ user, onPlanSelected, devMode }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFakeCheckout, setShowFakeCheckout] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [fakeCardNumber, setFakeCardNumber] = useState('');
  const [fakeExpiry, setFakeExpiry] = useState('');
  const [fakeCvv, setFakeCvv] = useState('');
  const [fakeName, setFakeName] = useState('');

  // Debug user authentication
  console.log('PricingPlans - User object:', user);
  console.log('PricingPlans - User UID:', user?.uid);
  console.log('PricingPlans - User Email:', user?.email);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 119,
      description: 'Perfect for small businesses',
      minutes: 300,
      features: [
        '300 AI-handled minutes/month',
        '1 dedicated phone number',
        'Basic AI receptionist features',
        'Standard business hours setup',
        'Email support',
        'Basic analytics dashboard'
      ],
      popular: false,
      color: 'blue'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 239,
      description: 'Ideal for growing businesses',
      minutes: 900,
      features: [
        '900 AI-handled minutes/month',
        '1 dedicated phone number',
        'Advanced AI features & custom voice',
        '24/7 availability',
        'Priority support',
        'Advanced analytics & insights',
        'Custom greetings & workflows'
      ],
      popular: true,
      color: 'blue'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 469,
      description: 'For high-volume businesses',
      minutes: 2400,
      features: [
        '2,400 AI-handled minutes/month',
        'Up to 3 phone numbers',
        'Premium AI features & voice clones',
        '24/7 priority routing',
        'Dedicated account manager',
        'Advanced integrations (CRM, calendar)',
        'Custom reporting & analytics'
      ],
      popular: false,
      color: 'blue'
    }
  ];

  const handlePlanSelect = async (plan) => {
    console.log('Plan selection started:', plan);
    
    // Check if user is properly authenticated
    if (!user || !user.uid || !user.email) {
      console.error('User not properly authenticated:', user);
      alert('Please sign in first to subscribe to a plan.');
      return;
    }
    
    // If dev mode, show fake checkout form
    if (devMode) {
      setSelectedPlanForCheckout(plan);
      setShowFakeCheckout(true);
      return;
    }
    
    setSelectedPlan(plan.id);
    setLoading(true);
    
    try {
      console.log('Calling redirectToCheckout with:', {
        planId: plan.id,
        userId: user.uid,
        userEmail: user.email
      });
      
      // Redirect to Stripe Checkout
      await redirectToCheckout(plan.id, user.uid, user.email);
      
      console.log('Redirecting to Stripe Checkout...');
      
    } catch (error) {
      console.error('Error processing payment:', error);
      alert(`Error processing payment: ${error.message}`);
      setSelectedPlan(null);
      setLoading(false);
    }
  };

  const handleFakePayment = async () => {
    // Validate fake card details (any numbers work)
    if (!fakeCardNumber || !fakeExpiry || !fakeCvv || !fakeName) {
      alert('Please fill in all card details');
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      console.log('🎭 Fake payment processed for dev mode:', {
        plan: selectedPlanForCheckout,
        cardNumber: fakeCardNumber.slice(-4),
        user: user.uid
      });
      
      // Simulate successful plan assignment
      onPlanSelected({
        ...selectedPlanForCheckout,
        devMode: true,
        paymentMethod: 'fake_card_' + fakeCardNumber.slice(-4)
      });
      
      setLoading(false);
      setShowFakeCheckout(false);
      
      // Reload to trigger the plan assignment
      window.location.reload();
    }, 2000);
  };

  // Show authentication warning if user is not properly authenticated
  if (!user || !user.uid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mb-6 mx-auto">
            <span className="text-2xl font-black text-white tracking-tight">A</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-lg text-gray-600 mb-8">Please sign in to view pricing plans.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen syntro-bg py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Syntro-Style Header */}
        <div className="text-center mb-20 fade-in">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
          </div>
          
          <h1 className="text-5xl syntro-heading mb-6">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">ADINA</span>
          </h1>
          
          <p className="text-xl syntro-body mb-12 max-w-3xl mx-auto">
            Choose the perfect plan for your business. Start with AI-powered phone reception that never sleeps, 
            never takes a break, and always represents your business professionally.
          </p>
          
          <div className="flex items-center justify-center space-x-8 text-sm syntro-caption">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              Secure payments via Stripe
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              Cancel anytime
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              24/7 AI support
            </div>
          </div>
        </div>

        {/* Syntro-Style Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`syntro-card ${plan.popular ? 'ring-2 ring-blue-500/20 relative' : ''} fade-in`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl syntro-heading mb-3">{plan.name}</h3>
                  <p className="syntro-body mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl syntro-heading">${plan.price}</span>
                    <span className="text-lg syntro-caption ml-2">/month CAD</span>
                  </div>
                  
                  <div className="text-sm syntro-caption mb-6">
                    {plan.minutes} minutes included • Additional minutes ${plan.id === 'starter' ? '0.47' : plan.id === 'professional' ? '0.40' : '0.34'} CAD each
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                      <span className="syntro-body text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.popular
                      ? 'syntro-button-primary'
                      : 'syntro-button'
                  }`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    <>
                      {devMode && <span className="mr-2">🔧</span>}
                      Subscribe to {plan.name}
                      {devMode && <span className="ml-2 text-xs opacity-75">(Dev Mode)</span>}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-gray-500 text-sm mb-4">
            {devMode ? (
              <>🔧 Dev Mode: Use any fake card details to test • All plans work with test data</>
            ) : (
              <>All plans include a 14-day free trial. Secure payments processed by Stripe.</>
            )}
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
            <span>🔒 Secure & Private</span>
            <span>⚡ Instant Setup</span>
            <span>📞 Professional Voice</span>
            <span>🤖 Advanced AI</span>
            <span>{devMode ? '🔧 Dev Testing' : '💳 Stripe Payments'}</span>
          </div>
        </div>
      </div>

      {/* Fake Checkout Modal */}
      {showFakeCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg mb-4 mx-auto">
                <span className="text-xl font-black text-white">🔧</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Dev Mode Checkout</h3>
              <p className="text-gray-600">
                Testing {selectedPlanForCheckout?.name} Plan - ${selectedPlanForCheckout?.price}/month
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456 (any numbers work)"
                  value={fakeCardNumber}
                  onChange={(e) => setFakeCardNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength="19"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={fakeExpiry}
                    onChange={(e) => setFakeExpiry(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={fakeCvv}
                    onChange={(e) => setFakeCvv(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength="4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fakeName}
                  onChange={(e) => setFakeName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={handleFakePayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  <>🔧 Process Fake Payment</>
                )}
              </button>

              <button
                onClick={() => setShowFakeCheckout(false)}
                disabled={loading}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Dev Mode:</strong> This is a fake checkout for testing. Any card details will work.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPlans; 