const axios = require('axios');

class NgrokHelper {
  constructor() {
    this.cachedUrl = null;
    this.lastCheck = null;
    this.checkInterval = 30000; // Check every 30 seconds
  }

  async getCurrentNgrokUrl() {
    try {
      // Check if we have a cached URL that's still fresh
      if (this.cachedUrl && this.lastCheck && (Date.now() - this.lastCheck) < this.checkInterval) {
        return this.cachedUrl;
      }

      // Try to get the ngrok URL from the local API
      const response = await axios.get('http://localhost:4040/api/tunnels', { timeout: 5000 });
      const tunnels = response.data.tunnels;
      
      if (tunnels && tunnels.length > 0) {
        // Find the HTTPS tunnel
        const httpsTunnel = tunnels.find(tunnel => tunnel.public_url.startsWith('https://'));
        if (httpsTunnel) {
          this.cachedUrl = httpsTunnel.public_url;
          this.lastCheck = Date.now();
          console.log('🌐 Detected ngrok URL:', this.cachedUrl);
          return this.cachedUrl;
        }
      }
      
      throw new Error('No HTTPS ngrok tunnel found');
    } catch (error) {
      console.error('❌ Failed to get ngrok URL:', error.message);
      
      // Fallback to environment variable or localhost
      const fallbackUrl = process.env.BASE_URL || 'http://localhost:3001';
      console.log('🔄 Using fallback URL:', fallbackUrl);
      return fallbackUrl;
    }
  }

  async getWebhookUrl() {
    const baseUrl = await this.getCurrentNgrokUrl();
    return `${baseUrl}/api/voice-webhook`;
  }

  // Check if the current URL is a localhost URL (not suitable for Twilio)
  isLocalUrl(url) {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }

  // Validate that the URL is accessible from the internet
  async validateWebhookUrl(url) {
    try {
      const response = await axios.get(`${url.replace('/api/voice-webhook', '/api/health')}`, { timeout: 10000 });
      return response.status === 200;
    } catch (error) {
      console.error('❌ Webhook URL validation failed:', error.message);
      return false;
    }
  }
}

module.exports = new NgrokHelper(); 