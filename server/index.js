// Increase Node.js HTTP header size limit to 64KB for large auth/cookie headers
const http = require('http');
const express = require('express');

const app = express();

app.get('/api/available-numbers', verifyToken, async (req, res) => {
  try {
    if (!twilioClient) {
      return res.json({
        success: true,
        numbers: mockNumbers,
        devMode: true,
        message: `Mock numbers for area code ${areaCode || 'various'} - configure Twilio credentials for real numbers`
      });
    }
    const { country = 'US', areaCode } = req.query;
    const searchOptions = { limit: 10 };
    if (areaCode) searchOptions.areaCode = areaCode;
    const numbers = await twilioClient.availablePhoneNumbers(country)
      .local
      .list(searchOptions);
    res.json({
      success: true,
      numbers: numbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        locality: num.locality,
        region: num.region
      }))
    });
  } catch (error) {
    console.error('Error fetching available numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available numbers',
      details: error.message,
      stack: error.stack || error.toString(),
      request: req.query
    });
  }
});

// If you use http.createServer, use this instead:
// const server = http.createServer({ maxHeaderSize: 65536 }, app);
// server.listen(port, ...);

// If you use app.listen, Node will use the global maxHeaderSize
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// ... existing code ... 