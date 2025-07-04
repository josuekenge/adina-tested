import React, { useState, useEffect } from 'react';
import { getAvailablePhoneNumbers, getAvailableAreaCodes, assignPhoneNumber } from '../services/phoneService';
import DevBypass from './DevBypass';

const PhoneSetup = ({ user, onPhoneAssigned }) => {
  const [step, setStep] = useState(1); // 1: area code, 2: number selection, 3: assigning
  const [country, setCountry] = useState('US');
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDevBypass, setShowDevBypass] = useState(false);
  
  // New state for fetched area codes
  const [availableAreaCodes, setAvailableAreaCodes] = useState([]);
  const [areaCodesLoading, setAreaCodesLoading] = useState(false);
  const [areaCodesError, setAreaCodesError] = useState(null);

  // Fetch available area codes when component mounts or country changes
  useEffect(() => {
    const fetchAreaCodes = async () => {
      setAreaCodesLoading(true);
      setAreaCodesError(null);
      
      try {
        const areaCodes = await getAvailableAreaCodes(country);
        setAvailableAreaCodes(areaCodes);
      } catch (error) {
        console.error('Error fetching area codes:', error);
        setAreaCodesError(error.message);
        // Fallback to empty array, user can still enter manual area code
        setAvailableAreaCodes([]);
      } finally {
        setAreaCodesLoading(false);
      }
    };

    fetchAreaCodes();
  }, [country]);

  const handleAreaCodeSubmit = async () => {
    if (!areaCode || areaCode.length !== 3) {
      setError('Please enter a valid 3-digit area code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const numbers = await getAvailablePhoneNumbers(country, areaCode);
      if (numbers.length === 0) {
        setError(`No available numbers found for area code ${areaCode} in ${country === 'US' ? 'United States' : 'Canada'}. Please try a different area code.`);
        setLoading(false);
        return;
      }
      setAvailableNumbers(numbers);
      setStep(2);
    } catch (error) {
      console.error('Error fetching numbers:', error);
      setError(error.message || 'Failed to fetch available numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberSelection = async () => {
    if (!selectedNumber) {
      setError('Please select a phone number');
      return;
    }

    setStep(3);
    setLoading(true);
    setError(null);

    try {
      const userData = await assignPhoneNumber(
        user.uid,
        user.email,
        user.displayName || user.email.split('@')[0],
        selectedNumber.phoneNumber,
        country
      );
      onPhoneAssigned(userData);
    } catch (error) {
      console.error('Error assigning number:', error);
      setError(error.message || 'Failed to assign phone number');
      setStep(2); // Go back to selection
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Convert +15551234567 to (555) 123-4567
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return phoneNumber;
  };

  // Show DevBypass if requested
  if (showDevBypass) {
    return <DevBypass user={user} onPhoneAssigned={onPhoneAssigned} onComplete={onPhoneAssigned} />;
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting up your AI Receptionist</h2>
          <p className="text-gray-600">Purchasing and configuring your phone number...</p>
          <p className="text-sm text-gray-500 mt-2">Selected: {formatPhoneNumber(selectedNumber?.phoneNumber)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-600">AI Voice Receptionist</h1>
              <p className="text-gray-600 mt-1">Set up your personal phone number</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDevBypass(true)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                title="Skip phone setup for development"
              >
                Dev
              </button>
              {user?.photoURL ? (
                <img className="h-8 w-8 rounded-full" src={user.photoURL} alt={user.displayName} />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-700">{user?.displayName || user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Choose Area Code</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Select Number</span>
            </div>
          </div>
        </div>

        {/* Step 1: Area Code Selection */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Area Code</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Select a country and area code for your AI receptionist phone number. This will determine the local area 
                your number appears to be from.
              </p>
            </div>

            {/* Country Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Country
              </label>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setCountry('US');
                    setAreaCode('');
                    setError(null);
                    setAreaCodesError(null);
                  }}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-colors ${
                    country === 'US'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:border-primary-300'
                  }`}
                >
                  🇺🇸 United States
                </button>
                <button
                  onClick={() => {
                    setCountry('CA');
                    setAreaCode('');
                    setError(null);
                    setAreaCodesError(null);
                  }}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-colors ${
                    country === 'CA'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:border-primary-300'
                  }`}
                >
                  🇨🇦 Canada
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Custom Area Code Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Area Code
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={areaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setAreaCode(value);
                    setError(null);
                  }}
                  placeholder="e.g., 555"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg font-mono"
                  maxLength="3"
                />
                <button
                  onClick={handleAreaCodeSubmit}
                  disabled={loading || !areaCode || areaCode.length !== 3}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Searching...' : 'Find Numbers'}
                </button>
              </div>
            </div>

            {/* Available Area Codes */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Or choose from available {country === 'US' ? 'US' : 'Canadian'} area codes:
              </h3>
              
              {areaCodesLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">Loading area codes from Twilio...</span>
                </div>
              )}
              
              {areaCodesError && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    {areaCodesError}
                  </p>
                  <p className="text-yellow-600 text-xs mt-1">
                    You can still enter an area code manually above to search for numbers.
                  </p>
                </div>
              )}
              
              {!areaCodesLoading && availableAreaCodes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableAreaCodes.map((area) => (
                    <button
                      key={area.code}
                      onClick={() => {
                        setAreaCode(area.code);
                        setError(null);
                      }}
                      className={`p-4 text-left border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors ${
                        areaCode === area.code ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="font-mono text-lg font-bold text-gray-900">({area.code})</div>
                      <div className="text-sm text-gray-600">{area.city}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {!areaCodesLoading && availableAreaCodes.length === 0 && !areaCodesError && (
                <div className="text-center py-8 text-gray-500">
                  <p>No area codes available for {country === 'US' ? 'United States' : 'Canada'} at this time.</p>
                  <p className="text-sm mt-1">Please enter an area code manually above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Number Selection */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Phone Number</h2>
              <p className="text-gray-600">
                Available {country === 'US' ? 'US' : 'Canadian'} numbers in area code ({areaCode}). Select the one you'd like for your AI receptionist.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3 mb-8">
              {availableNumbers.map((number, index) => (
                <div
                  key={number.phoneNumber}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedNumber?.phoneNumber === number.phoneNumber
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedNumber(number);
                    setError(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xl font-bold text-gray-900">
                        {formatPhoneNumber(number.phoneNumber)}
                      </div>
                      {number.locality && number.region && (
                        <div className="text-sm text-gray-600">
                          {number.locality}, {number.region}
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedNumber?.phoneNumber === number.phoneNumber
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedNumber?.phoneNumber === number.phoneNumber && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedNumber(null);
                  setAvailableNumbers([]);
                  setError(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Back to Area Code
              </button>
              <button
                onClick={handleNumberSelection}
                disabled={!selectedNumber || loading}
                className="px-8 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Assigning...' : 'Get This Number'}
              </button>
            </div>

            {/* Pricing Info */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Pricing Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {country === 'US' 
                      ? 'Phone number: $1.15/month • Incoming calls: $0.0085/minute • Text-to-speech: $0.016/1000 characters'
                      : 'Phone number: $1.15/month • Incoming calls: $0.0085/minute • Text-to-speech: $0.016/1000 characters'
                    }
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {country === 'US' ? 'US pricing in USD' : 'Canadian pricing in USD'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneSetup; 