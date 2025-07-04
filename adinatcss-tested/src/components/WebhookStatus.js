import React, { useState, useEffect } from 'react';

const WebhookStatus = ({ user }) => {
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchWebhookInfo = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/webhook-url');
      const data = await response.json();
      setWebhookInfo(data);
    } catch (err) {
      console.error('Error fetching webhook info:', err);
      setError('Failed to fetch webhook information');
    } finally {
      setLoading(false);
    }
  };

  const updateWebhookUrl = async () => {
    if (!user) return;
    
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:3001/api/update-webhook/${user.uid}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Webhook URL updated successfully for ${data.phoneNumber}`);
        // Refresh webhook info
        await fetchWebhookInfo();
      } else {
        setError(data.error || 'Failed to update webhook URL');
      }
    } catch (err) {
      console.error('Error updating webhook:', err);
      setError('Failed to update webhook URL');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchWebhookInfo();
    
    // Refresh webhook info every 30 seconds
    const interval = setInterval(fetchWebhookInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Webhook Status</h3>
        <button
          onClick={fetchWebhookInfo}
          className="text-sm text-blue-600 hover:text-blue-800"
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
      
      {webhookInfo && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Webhook URL
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono">
                {webhookInfo.webhookUrl}
              </code>
              <div className="flex-shrink-0">
                {webhookInfo.isLocal ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Local
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Public
                  </span>
                )}
              </div>
            </div>
            
            {webhookInfo.warning && (
              <p className="mt-1 text-sm text-yellow-600">
                ⚠️ {webhookInfo.warning}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">
                Last updated: {new Date(webhookInfo.timestamp).toLocaleString()}
              </p>
              {webhookInfo.isLocal && (
                <p className="text-sm text-gray-500 mt-1">
                  Make sure ngrok is running for phone calls to work properly.
                </p>
              )}
            </div>
            
            <button
              onClick={updateWebhookUrl}
              disabled={updating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Webhook'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookStatus; 