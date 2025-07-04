import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import { getSubscriptionStatus } from './services/stripeService';
import './FramerStyles.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    // Check for successful Stripe checkout
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      setCheckoutSuccess(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user has an active subscription
        setPlanLoading(true);
        
        if (devMode) {
          // DEV MODE - Create a mock plan for testing without payment
          const mockPlan = {
            id: 'professional',
            name: 'Professional (Dev Mode)',
            status: 'active',
            minutesIncluded: 900,
            overageRate: 0.40,
            price: 239,
            // Mock subscription data
            customerId: 'cus_mock_customer',
            subscriptionId: 'sub_mock_subscription',
            currentPeriodStart: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // 7 days ago
            currentPeriodEnd: Math.floor(Date.now() / 1000) + (23 * 24 * 60 * 60), // 23 days from now
            cancelAtPeriodEnd: false,
            devMode: true
          };
          
          setUserPlan(mockPlan);
          console.log('🎭 Using dev mode - bypassing payment:', mockPlan);
          setPlanLoading(false);
        } else {
          // PRODUCTION MODE - Check real subscription
          try {
            const subscriptionStatus = await getSubscriptionStatus(user.uid);
            if (subscriptionStatus.hasSubscription) {
              // Map Stripe subscription to our plan format
              const planData = {
                id: subscriptionStatus.subscription.planId,
                name: subscriptionStatus.subscription.planId.charAt(0).toUpperCase() + subscriptionStatus.subscription.planId.slice(1),
                status: subscriptionStatus.subscription.status,
                customerId: subscriptionStatus.customerId,
                subscriptionId: subscriptionStatus.subscription.id,
                currentPeriodStart: subscriptionStatus.subscription.currentPeriodStart,
                currentPeriodEnd: subscriptionStatus.subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscriptionStatus.subscription.cancelAtPeriodEnd,
                // Add minute limits based on plan
                minutesIncluded: getPlanMinutes(subscriptionStatus.subscription.planId),
                overageRate: getPlanOverageRate(subscriptionStatus.subscription.planId),
                devMode: false
              };
              setUserPlan(planData);
            } else {
              setUserPlan(null);
            }
          } catch (error) {
            console.error('Error checking subscription status:', error);
            setUserPlan(null);
          }
          setPlanLoading(false);
        }
      } else {
        setUserPlan(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [devMode]);

  // Helper functions to get plan details
  const getPlanMinutes = (planId) => {
    const planMinutes = {
      starter: 300,
      professional: 900,
      enterprise: 2400
    };
    return planMinutes[planId] || 300;
  };

  const getPlanOverageRate = (planId) => {
    const overageRates = {
      starter: 0.35,
      professional: 0.30,
      enterprise: 0.25
    };
    return overageRates[planId] || 0.35;
  };

  const handleLogin = () => {
    // This will be handled by onAuthStateChanged
  };

  const handleLogout = () => {
    setUser(null);
    setUserPlan(null);
  };

  const handlePlanSelected = async (planData) => {
    // This function is now handled by Stripe checkout
    // The actual plan assignment happens via webhook after successful payment
    console.log('Plan selection initiated:', planData);
  };

  if (loading) {
    return (
      <div className="framer-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <div className="framer-spinner mx-auto mb-4"></div>
          <p className="framer-text-lg">Loading ADINA...</p>
        </div>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="framer-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <div className="framer-spinner mx-auto mb-4"></div>
          <p className="framer-text-lg">
            {checkoutSuccess ? 'Processing your subscription...' : 'Setting up your account...'}
          </p>
        </div>
      </div>
    );
  }

  // Show success message if user just completed checkout
  if (checkoutSuccess && user && userPlan) {
    return (
      <div className="framer-bg min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="framer-heading-lg mb-4">Welcome to ADINA!</h1>
          <p className="framer-text-lg mb-8">
            Your subscription is now active. Let's get started with your AI voice receptionist.
          </p>
          <button
            onClick={() => setCheckoutSuccess(false)}
            className="framer-btn framer-btn-primary px-8 py-3"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Dev Mode Toggle - Show on all screens */}
      <div className="fixed top-4 right-4 z-[9999]">
        <button
          onClick={() => setDevMode(!devMode)}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 shadow-xl border-2 ${
            devMode 
              ? 'bg-green-500 text-white hover:bg-green-600 border-green-400 shadow-green-200' 
              : 'bg-blue-500 text-white hover:bg-blue-600 border-blue-400 shadow-blue-200'
          }`}
          title={devMode ? 'Dev Mode: ON - Click to disable and use real payments' : 'Dev Mode: OFF - Click to enable testing without payment'}
        >
          {devMode ? '🔧 DEV MODE' : '💳 PROD MODE'}
        </button>
      </div>

      {user ? (
        userPlan ? (
          <Dashboard user={user} userPlan={userPlan} onLogout={handleLogout} />
        ) : (
          <LandingPage user={user} onPlanSelected={handlePlanSelected} devMode={devMode} />
        )
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App; 