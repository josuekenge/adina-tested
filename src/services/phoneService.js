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
    let details = error.stack || error.toString();
    throw new Error(`getAvailableAreaCodes: ${error.message} | Details: ${details}`);
  }
};

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
    let details = error.stack || error.toString();
    throw new Error(`getAvailablePhoneNumbers: ${error.message} | Details: ${details}`);
  }
};

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
    let details = error.stack || error.toString();
    // Handle specific Twilio errors
    if (error.message.includes('not available')) {
      throw new Error(`assignPhoneNumber: The selected phone number is no longer available. Please try another number. | Details: ${details}`);
    }
    if (error.message.includes('insufficient funds')) {
      throw new Error(`assignPhoneNumber: Insufficient Twilio account balance to purchase phone number. | Details: ${details}`);
    }
    if (error.message.includes('401')) {
      throw new Error(`assignPhoneNumber: Authentication failed. Please sign in again. | Details: ${details}`);
    }
    throw new Error(`assignPhoneNumber: ${error.message} | Details: ${details}`);
  }
}; 