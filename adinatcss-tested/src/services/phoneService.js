import { auth } from '../firebase';

// API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://your-backend-url.com'
  : 'http://localhost:3001';

// Helper function to get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

// Helper function to create fetch request with auth
const createAuthedRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();
  
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Get user data from backend
export const getUserData = async (userId) => {
  try {
    const data = await createAuthedRequest(`/api/user-data/${userId}`);
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to get user data');
    }
  } catch (error) {
    console.error('Error getting user data:', error);
    if (error.message.includes('401')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    throw new Error(error.message || 'Network error');
  }
};

// Get available area codes from Twilio
export const getAvailableAreaCodes = async (country = 'US') => {
  try {
    const params = new URLSearchParams({ country });
    
    const data = await createAuthedRequest(`/api/available-area-codes?${params}`);
    
    if (data.success) {
      return data.areaCodes;
    } else {
      throw new Error(data.error || 'Failed to get available area codes');
    }
  } catch (error) {
    console.error('Error getting available area codes:', error);
    throw new Error(error.message || 'Network error');
  }
};

// Get available phone numbers from Twilio
export const getAvailablePhoneNumbers = async (country = 'US', areaCode = null) => {
  try {
    const params = new URLSearchParams({ country });
    if (areaCode) params.append('areaCode', areaCode);
    
    const data = await createAuthedRequest(`/api/available-numbers?${params}`);
    
    if (data.success) {
      return data.numbers;
    } else {
      throw new Error(data.error || 'Failed to get available numbers');
    }
  } catch (error) {
    console.error('Error getting available numbers:', error);
    throw new Error(error.message || 'Network error');
  }
};

// Assign a real Twilio phone number to a user
export const assignPhoneNumber = async (userId, userEmail, userName, specificNumber = null, country = 'US') => {
  try {
    const requestData = {
      userEmail,
      userName,
      country
    };
    
    if (specificNumber) {
      requestData.phoneNumber = specificNumber;
    }
    
    const data = await createAuthedRequest('/api/assign-phone-number', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to assign phone number');
    }
  } catch (error) {
    console.error('Error assigning phone number:', error);
    
    // Handle specific Twilio errors
    if (error.message.includes('not available')) {
      throw new Error('The selected phone number is no longer available. Please try another number.');
    }
    if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient Twilio account balance to purchase phone number.');
    }
    if (error.message.includes('401')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    
    throw new Error(error.message || 'Failed to assign phone number');
  }
};

// Update voice agent configuration
export const updateVoiceAgentConfig = async (userId, config) => {
  try {
    const data = await createAuthedRequest(`/api/voice-config/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ voiceAgentConfig: config })
    });
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to update voice configuration');
    }
  } catch (error) {
    console.error('Error updating voice agent config:', error);
    if (error.message.includes('401')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    throw new Error(error.message || 'Network error');
  }
};

// Check server health and configuration
export const checkServerHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return await response.json();
  } catch (error) {
    console.error('Error checking server health:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
};

// Release/delete a phone number (optional)
export const releasePhoneNumber = async (userId) => {
  try {
    const data = await createAuthedRequest(`/api/release-phone-number/${userId}`, {
      method: 'DELETE'
    });
    
    if (data.success) {
      return data;
    } else {
      throw new Error(data.error || 'Failed to release phone number');
    }
  } catch (error) {
    console.error('Error releasing phone number:', error);
    throw new Error(error.message || 'Network error');
  }
};

// Test the phone number by making a call
export const testPhoneNumber = async (phoneNumber) => {
  try {
    console.log('📞 Initiating test call to:', phoneNumber);
    
    const data = await createAuthedRequest('/api/test-phone-number', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });
    
    if (data.success) {
      console.log('✅ Test call response:', data);
      return data;
    } else {
      throw new Error(data.error || 'Failed to test phone number');
    }
  } catch (error) {
    console.error('❌ Error testing phone number:', error);
    throw new Error(error.message || 'Network error');
  }
}; 