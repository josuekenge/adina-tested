import { loadStripe } from '@stripe/stripe-js';
import { auth } from '../firebase';

// Initialize Stripe with your publishable key (with error handling)
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey || stripePublishableKey === 'pk_test_your_publishable_key_here') {
  console.warn('⚠️ Stripe publishable key not configured. Please add REACT_APP_STRIPE_PUBLISHABLE_KEY to your .env file');
} else {
  console.log('✅ Stripe publishable key loaded:', stripePublishableKey.substring(0, 20) + '...');
}

const stripePromise = stripePublishableKey && stripePublishableKey !== 'pk_test_your_publishable_key_here' 
  ? loadStripe(stripePublishableKey)
  : null;

// API Base URL - Use relative paths since we have a proxy configured
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_URL || 'http://localhost:3001')
  : ''; // Use relative paths in development due to proxy

// Helper function to get auth headers
const getAuthHeaders = async () => {
  console.log('🔐 Getting auth headers...');
  console.log('🔐 Firebase auth object:', auth);
  console.log('🔐 Current user:', auth.currentUser);
  
  const user = auth.currentUser;
  if (!user) {
    console.error('🔐 No current user found');
    throw new Error('User not authenticated');
  }
  
  console.log('🔐 User found:', {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  });
  
  try {
    const token = await user.getIdToken();
    console.log('🔐 Token generated successfully, length:', token.length);
    console.log('🔐 Token preview:', token.substring(0, 50) + '...');
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error('🔐 Error getting ID token:', error);
    throw new Error('Failed to get authentication token');
  }
};

// Stripe price IDs for each plan (you'll need to create these in Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  starter: process.env.REACT_APP_STRIPE_STARTER_PRICE_ID || 'price_starter_monthly',
  professional: process.env.REACT_APP_STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_monthly',
  enterprise: process.env.REACT_APP_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
};

// Plan configurations with Stripe price IDs
export const STRIPE_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 119,
    minutesIncluded: 300,
    stripePrice: STRIPE_PRICE_IDS.starter,
    overageRate: 0.47
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 239,
    minutesIncluded: 900,
    stripePrice: STRIPE_PRICE_IDS.professional,
    overageRate: 0.40
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 469,
    minutesIncluded: 2400,
    stripePrice: STRIPE_PRICE_IDS.enterprise,
    overageRate: 0.34
  }
};

// Create a checkout session for subscription
export const createCheckoutSession = async (planId, userId, userEmail) => {
  try {
    console.log('💳 Creating checkout session for:', { planId, userId, userEmail });
    
    const plan = STRIPE_PLANS[planId];
    if (!plan) {
      throw new Error('Invalid plan selected');
    }
    
    console.log('💳 Plan details:', plan);

    const headers = await getAuthHeaders();
    console.log('💳 Headers prepared:', headers);
    
    const requestBody = {
      priceId: plan.stripePrice,
      userId,
      userEmail,
      planId,
      successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing`
    };
    
    console.log('💳 Request body:', requestBody);
    console.log('💳 API URL:', `${API_BASE_URL}/api/create-checkout-session`);

    const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('💳 Response status:', response.status);
    console.log('💳 Response ok:', response.ok);

    const session = await response.json();
    console.log('💳 Response data:', session);
    
    if (!response.ok) {
      throw new Error(session.error || 'Failed to create checkout session');
    }

    return session;
  } catch (error) {
    console.error('💳 Error creating checkout session:', error);
    throw error;
  }
};

// Redirect to Stripe Checkout
export const redirectToCheckout = async (planId, userId, userEmail) => {
  try {
    console.log('💳 redirectToCheckout called with:', { planId, userId, userEmail });
    
    if (!stripePromise) {
      console.error('💳 Stripe not configured - stripePromise is null');
      throw new Error('Stripe is not configured. Please add your Stripe publishable key to the .env file.');
    }

    console.log('💳 Loading Stripe instance...');
    const stripe = await stripePromise;
    
    if (!stripe) {
      console.error('💳 Failed to load Stripe instance');
      throw new Error('Failed to load Stripe. Please check your internet connection.');
    }
    
    console.log('💳 Stripe instance loaded successfully');
    console.log('💳 Creating checkout session...');
    const session = await createCheckoutSession(planId, userId, userEmail);
    
    if (!session || !session.id) {
      console.error('💳 Invalid session returned:', session);
      throw new Error('Failed to create checkout session');
    }
    
    console.log('💳 Checkout session created:', session.id);
    console.log('💳 Redirecting to Stripe Checkout...');
    
    const { error } = await stripe.redirectToCheckout({
      sessionId: session.id,
    });

    if (error) {
      console.error('💳 Stripe redirect error:', error);
      throw error;
    }
    
    console.log('💳 Redirect initiated successfully');
  } catch (error) {
    console.error('💳 Error in redirectToCheckout:', error);
    throw error;
  }
};

// Create a billing portal session for subscription management
export const createBillingPortalSession = async (customerId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/create-billing-portal-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId,
        returnUrl: `${window.location.origin}/dashboard`
      }),
    });

    const session = await response.json();
    
    if (!response.ok) {
      throw new Error(session.error || 'Failed to create billing portal session');
    }

    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
};

// Redirect to Stripe billing portal
export const redirectToBillingPortal = async (customerId) => {
  try {
    const session = await createBillingPortalSession(customerId);
    window.location.href = session.url;
  } catch (error) {
    console.error('Error redirecting to billing portal:', error);
    throw error;
  }
};

// Get subscription status
export const getSubscriptionStatus = async (userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/subscription-status/${userId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get subscription status');
    }

    return data;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
};

// Create usage record for overage billing
export const createUsageRecord = async (subscriptionItemId, quantity, timestamp) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/create-usage-record`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscriptionItemId,
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000)
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create usage record');
    }

    return data;
  } catch (error) {
    console.error('Error creating usage record:', error);
    throw error;
  }
};

// Report minute usage for billing
export const reportMinuteUsage = async (userId, minutesUsed) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/report-usage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        minutesUsed,
        timestamp: Math.floor(Date.now() / 1000)
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to report usage');
    }

    return data;
  } catch (error) {
    console.error('Error reporting usage:', error);
    throw error;
  }
}; 