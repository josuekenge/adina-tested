const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const admin = require('firebase-admin');
const AIService = require('./services/aiService');
const ngrokHelper = require('./utils/ngrokHelper');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:3006',
    'http://192.168.2.97:3004',
    'http://192.168.2.97:3006'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse form data from Twilio

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  console.log('HEADERS:', req.headers);
  next();
});

// Check if we have required credentials
const hasFirebaseCredentials = (process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID) && 
                              process.env.FIREBASE_CLIENT_EMAIL && 
                              process.env.FIREBASE_PRIVATE_KEY &&
                              process.env.FIREBASE_PRIVATE_KEY !== "your_private_key_here";

const hasTwilioCredentials = process.env.TWILIO_ACCOUNT_SID && 
                           process.env.TWILIO_AUTH_TOKEN &&
                           process.env.TWILIO_ACCOUNT_SID !== "your_twilio_account_sid_here" &&
                           process.env.TWILIO_AUTH_TOKEN !== "your_twilio_auth_token_here" &&
                           !process.env.TWILIO_ACCOUNT_SID.includes("xxxxxxxx") &&
                           !process.env.TWILIO_AUTH_TOKEN.includes("your_");

let db = null;
let twilioClient = null;
let aiService = null;
let isDevMode = false;

// Store active conversations
const activeConversations = new Map();

// In-memory conversation storage for dev mode
const savedConversations = new Map();

// Periodic cleanup for orphaned conversations (every 2 minutes)
setInterval(async () => {
  const now = Date.now();
  const orphanedConversations = [];
  
  // Find conversations older than 2 minutes that are still active
  for (const [callSid, conversation] of activeConversations.entries()) {
    const conversationAge = now - new Date(conversation.startTime).getTime();
    if (conversationAge > 120000) { // 2 minutes
      orphanedConversations.push([callSid, conversation]);
    }
  }
  
  // Save and clean up orphaned conversations
  for (const [callSid, conversation] of orphanedConversations) {
    try {
      console.log(`🧹 Cleaning up orphaned conversation: ${callSid}`);
      
      const conversationData = {
        ...conversation,
        endTime: new Date().toISOString(),
        duration: Math.round((now - new Date(conversation.startTime).getTime()) / 1000),
        endReason: 'timeout_cleanup'
      };
      
      if (db && !isDevMode && conversation.userData) {
        // Find userId for database save
        let userId = 'unknown';
        try {
          const userQuery = await db.collection('users')
            .where('phoneNumber', '==', conversation.phoneNumber)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            userId = userQuery.docs[0].id;
            conversationData.userId = userId;
            await db.collection('conversations').add(conversationData);
            console.log('✅ Orphaned conversation saved to database');
          }
        } catch (error) {
          console.error('❌ Error saving orphaned conversation to database:', error);
        }
      } else {
        // Save to memory in dev mode
        conversationData.userId = 'dev-user-123';
        conversationData.id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        savedConversations.set(conversationData.id, conversationData);
        console.log('✅ Orphaned conversation saved to memory (dev mode)');
      }
      
      activeConversations.delete(callSid);
    } catch (error) {
      console.error('❌ Error cleaning up orphaned conversation:', error);
    }
  }
  
  if (orphanedConversations.length > 0) {
    console.log(`🧹 Cleaned up ${orphanedConversations.length} orphaned conversations`);
  }
}, 120000); // Run every 2 minutes

// Firebase Admin Configuration
if (hasFirebaseCredentials) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID;
    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
    });
    
    db = admin.firestore();
    console.log('🔥 Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    isDevMode = true;
  }
} else {
  console.log('⚠️  Firebase credentials missing - running in development mode with mock data');
  isDevMode = true;
}

// Initialize Twilio
if (hasTwilioCredentials) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('📞 Twilio client initialized successfully');
  } catch (error) {
    console.error('❌ Twilio initialization error:', error.message);
    isDevMode = true;
  }
} else {
  console.log('⚠️  Twilio credentials missing - phone number assignment will use mock data');
  isDevMode = true;
}

// Initialize AI Service
try {
  aiService = new AIService();
  console.log('🤖 AI Service initialized successfully');
} catch (error) {
  console.error('❌ AI Service initialization error:', error.message);
}

// Mock data for development with file persistence
const fs = require('fs');
const path = require('path');

const mockUsersFile = path.join(__dirname, 'mock-users.json');
const mockUsers = new Map();

// Load existing mock users from file
const loadMockUsers = () => {
  try {
    if (fs.existsSync(mockUsersFile)) {
      const data = fs.readFileSync(mockUsersFile, 'utf8');
      const users = JSON.parse(data);
      Object.entries(users).forEach(([userId, userData]) => {
        mockUsers.set(userId, userData);
      });
      console.log(`📂 Loaded ${mockUsers.size} mock users from file`);
    }
  } catch (error) {
    console.error('Error loading mock users:', error);
  }
};

// Save mock users to file
const saveMockUsers = () => {
  try {
    const users = Object.fromEntries(mockUsers);
    fs.writeFileSync(mockUsersFile, JSON.stringify(users, null, 2));
    console.log(`💾 Saved ${mockUsers.size} mock users to file`);
  } catch (error) {
    console.error('Error saving mock users:', error);
  }
};

// Load mock users on startup
loadMockUsers();

// Health check endpoint for webhook validation
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'AI Voice Receptionist API',
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    aiConfigured: !!(process.env.OPENAI_API_KEY && process.env.ELEVENLABS_API_KEY),
    activeConversations: activeConversations.size,
    savedConversations: savedConversations.size,
    devMode: isDevMode
  });
});

// Debug endpoint to check Twilio client status
app.get('/api/debug-twilio', (req, res) => {
  res.json({
    hasTwilioCredentials: !!(process.env.TWILIO_ACCOUNT_SID && 
                           process.env.TWILIO_AUTH_TOKEN &&
                           process.env.TWILIO_ACCOUNT_SID !== "your_twilio_account_sid_here" &&
                           process.env.TWILIO_AUTH_TOKEN !== "your_twilio_auth_token_here" &&
                           !process.env.TWILIO_ACCOUNT_SID.includes("xxxxxxxx") &&
                           !process.env.TWILIO_AUTH_TOKEN.includes("your_")),
    twilioClientExists: !!twilioClient,
    accountSid: process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.substring(0, 6) + '***' : 'NOT_SET',
    authToken: process.env.TWILIO_AUTH_TOKEN ? '***SET***' : 'NOT_SET',
    devMode: isDevMode
  });
});

// Debug endpoint to check Firebase status
app.get('/api/debug-firebase', (req, res) => {
  res.json({
    hasFirebaseCredentials: !!(process.env.FIREBASE_PROJECT_ID && 
                             process.env.FIREBASE_CLIENT_EMAIL && 
                             process.env.FIREBASE_PRIVATE_KEY &&
                             process.env.FIREBASE_PRIVATE_KEY !== "your_private_key_here"),
    firebaseDbExists: !!db,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? process.env.FIREBASE_CLIENT_EMAIL.substring(0, 20) + '***' : 'NOT_SET',
    privateKeySet: !!process.env.FIREBASE_PRIVATE_KEY,
    isDevMode: isDevMode,
    adminInitialized: !!admin.apps.length
  });
});

// Get current webhook URL for debugging
app.get('/api/webhook-url', async (req, res) => {
  try {
    const webhookUrl = await ngrokHelper.getWebhookUrl();
    const isLocal = ngrokHelper.isLocalUrl(webhookUrl);
    
    res.json({
      webhookUrl,
      isLocal,
      warning: isLocal ? 'This is a localhost URL and may not work with Twilio webhooks' : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get webhook URL',
      details: error.message
    });
  }
});

// Helper function to verify Firebase token (with dev mode fallback)
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      console.log('❌ No token provided, using dev user');
      // Use a consistent dev user ID so data persists
      req.user = { 
        uid: 'dev-user-real-persistence', 
        email: 'dev@example.com',
        name: 'Dev User'
      };
      return next();
    }
    
    try {
      // Try to decode the real Firebase token first
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      console.log('✅ Using real Firebase user:', decodedToken.uid.substring(0, 8) + '***');
      next();
    } catch (tokenError) {
      console.log('⚠️ Token verification failed, using dev user for persistence:', tokenError.message);
      // Use a consistent dev user ID so data persists
      req.user = { 
        uid: 'dev-user-real-persistence', 
        email: 'dev@example.com',
        name: 'Dev User'
      };
      next();
    }
  } catch (error) {
    console.error('General auth error:', error);
    // Use a consistent dev user ID so data persists
    req.user = { 
      uid: 'dev-user-real-persistence', 
      email: 'dev@example.com',
      name: 'Dev User'
    };
    next();
  }
};

// Get available area codes from Twilio (with mock data fallback)
app.get('/api/available-area-codes', verifyToken, async (req, res) => {
  try {
    const { country = 'US' } = req.query;
    
    if (!twilioClient) {
      // Mock area codes when Twilio is not configured
      const mockAreaCodes = country === 'US' ? [
        { code: '212', city: 'New York, NY', region: 'NY' },
        { code: '213', city: 'Los Angeles, CA', region: 'CA' },
        { code: '312', city: 'Chicago, IL', region: 'IL' },
        { code: '415', city: 'San Francisco, CA', region: 'CA' },
        { code: '617', city: 'Boston, MA', region: 'MA' },
        { code: '202', city: 'Washington, DC', region: 'DC' },
        { code: '305', city: 'Miami, FL', region: 'FL' },
        { code: '404', city: 'Atlanta, GA', region: 'GA' },
        { code: '214', city: 'Dallas, TX', region: 'TX' },
        { code: '206', city: 'Seattle, WA', region: 'WA' },
        { code: '702', city: 'Las Vegas, NV', region: 'NV' },
        { code: '303', city: 'Denver, CO', region: 'CO' },
      ] : [
        { code: '416', city: 'Toronto, ON', region: 'ON' },
        { code: '647', city: 'Toronto, ON', region: 'ON' },
        { code: '437', city: 'Toronto, ON', region: 'ON' },
        { code: '604', city: 'Vancouver, BC', region: 'BC' },
        { code: '778', city: 'Vancouver, BC', region: 'BC' },
        { code: '236', city: 'Vancouver, BC', region: 'BC' },
        { code: '514', city: 'Montreal, QC', region: 'QC' },
        { code: '438', city: 'Montreal, QC', region: 'QC' },
        { code: '403', city: 'Calgary, AB', region: 'AB' },
        { code: '587', city: 'Calgary, AB', region: 'AB' },
        { code: '780', city: 'Edmonton, AB', region: 'AB' },
        { code: '825', city: 'Edmonton, AB', region: 'AB' },
        { code: '613', city: 'Ottawa, ON', region: 'ON' },
        { code: '343', city: 'Ottawa, ON', region: 'ON' },
        { code: '902', city: 'Halifax, NS', region: 'NS' },
        { code: '204', city: 'Winnipeg, MB', region: 'MB' },
      ];
      
      return res.json({
        success: true,
        areaCodes: mockAreaCodes,
        devMode: true,
        message: 'Mock area codes - configure Twilio credentials for real data'
      });
    }
    
    try {
      // Fetch available numbers to discover area codes
      const numbers = await twilioClient.availablePhoneNumbers(country)
        .local
        .list({ limit: 50 });
      
      // Extract unique area codes with location info
      const areaCodeMap = new Map();
      
      numbers.forEach(num => {
        const phoneNumber = num.phoneNumber.replace(/\D/g, '');
        const areaCode = phoneNumber.slice(1, 4); // Remove country code, get area code
        
        if (!areaCodeMap.has(areaCode)) {
          areaCodeMap.set(areaCode, {
            code: areaCode,
            city: num.locality && num.region ? `${num.locality}, ${num.region}` : 'Available',
            region: num.region || '',
            locality: num.locality || ''
          });
        }
      });
      
      const availableAreaCodes = Array.from(areaCodeMap.values()).sort((a, b) => a.code.localeCompare(b.code));
      
      res.json({
        success: true,
        areaCodes: availableAreaCodes,
        total: availableAreaCodes.length
      });
      
    } catch (error) {
      console.error('Error fetching from Twilio:', error);
      // Fall back to a basic search if the full search fails
      res.json({
        success: true,
        areaCodes: [],
        error: 'Unable to fetch area codes from Twilio',
        message: 'Please enter an area code manually to search for available numbers'
      });
    }
    
  } catch (error) {
    console.error('Error fetching available area codes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch available area codes',
      details: error.message 
    });
  }
});

// Get available phone numbers from Twilio (with mock data fallback)
app.get('/api/available-numbers', verifyToken, async (req, res) => {
  try {
    if (!twilioClient) {
      // Generate realistic mock numbers based on area code
      const { country = 'US', areaCode } = req.query;
      
      const generateMockNumbers = (area, region, locality) => {
        const numbers = [];
        for (let i = 0; i < 3; i++) {
          const exchange = String(Math.floor(Math.random() * 900) + 100);
          const number = String(Math.floor(Math.random() * 9000) + 1000);
          const phoneNumber = `+1${area}${exchange}${number}`;
          const friendlyName = `(${area}) ${exchange}-${number}`;
          
          numbers.push({
            phoneNumber,
            friendlyName,
            locality,
            region
          });
        }
        return numbers;
      };
      
      let mockNumbers;
      
      if (areaCode) {
        // Generate numbers for specific area code
        const areaCodeMap = {
          '212': { locality: 'New York', region: 'NY' },
          '213': { locality: 'Los Angeles', region: 'CA' },
          '312': { locality: 'Chicago', region: 'IL' },
          '415': { locality: 'San Francisco', region: 'CA' },
          '617': { locality: 'Boston', region: 'MA' },
          '202': { locality: 'Washington', region: 'DC' },
          '305': { locality: 'Miami', region: 'FL' },
          '404': { locality: 'Atlanta', region: 'GA' },
          '214': { locality: 'Dallas', region: 'TX' },
          '206': { locality: 'Seattle', region: 'WA' },
          '343': { locality: 'Ottawa', region: 'ON' },
          '416': { locality: 'Toronto', region: 'ON' },
          '604': { locality: 'Vancouver', region: 'BC' },
          '514': { locality: 'Montreal', region: 'QC' }
        };
        
        const location = areaCodeMap[areaCode] || { locality: 'Unknown City', region: country === 'CA' ? 'ON' : 'NY' };
        mockNumbers = generateMockNumbers(areaCode, location.region, location.locality);
      } else {
        // Default numbers
        mockNumbers = [
          ...generateMockNumbers('555', 'CA', 'San Francisco').slice(0, 1),
          ...generateMockNumbers('555', 'NY', 'New York').slice(0, 1),
          ...generateMockNumbers('555', 'IL', 'Chicago').slice(0, 1)
        ];
      }
      
      return res.json({
        success: true,
        numbers: mockNumbers,
        devMode: true,
        message: `Mock numbers for area code ${areaCode || 'various'} - configure Twilio credentials for real numbers`
      });
    }
    
    const { country = 'US', areaCode } = req.query;
    
    const searchOptions = {
      limit: 10,
    };
    
    if (areaCode) {
      searchOptions.areaCode = areaCode;
    }
    
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
      details: error.message 
    });
  }
});

// Purchase and assign a phone number to user (with mock data fallback)
app.post('/api/assign-phone-number', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { phoneNumber, userEmail, userName } = req.body;
    
    if (isDevMode) {
      console.log('📝 Using mock phone number assignment (isDevMode = true)');
      // Mock phone number assignment
      const mockPhoneNumber = phoneNumber || '+1555DEMO123';
      const userData = {
        userId,
        email: userEmail || req.user.email,
        name: userName || req.user.name,
        phoneNumber: mockPhoneNumber,
        voiceAgentConfig: {
          name: 'AI Receptionist',
          greeting: `Hello! You've reached ${userName || 'our office'}. How can I help you today?`,
          businessHours: '9:00 AM - 5:00 PM',
          enabled: true
        },
        assignedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        devMode: true
      };
      
      mockUsers.set(userId, userData);
      saveMockUsers(); // Persist to file
      
      return res.json({
        success: true,
        data: userData,
        message: 'Mock phone number assigned and saved - configure Twilio/Firebase for real functionality'
      });
    }
    
    console.log('🔥 Using REAL Firestore for phone number assignment (isDevMode = false)');
    
    // Check if user already has a phone number (allow multiple numbers)
    const userDoc = await db.collection('users').doc(userId).get();
    const existingData = userDoc.exists ? userDoc.data() : null;
    
    let assignedNumber;
    
    // Get the current webhook URL
    const webhookUrl = await ngrokHelper.getWebhookUrl();
    console.log('🔗 Using webhook URL:', webhookUrl);
    
    // Validate webhook URL before proceeding
    if (ngrokHelper.isLocalUrl(webhookUrl)) {
      console.warn('⚠️  Warning: Using localhost URL for webhook. This may not work with Twilio.');
    }
    
    if (phoneNumber) {
      // Purchase the specific number requested
      try {
        const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber: phoneNumber,
          voiceUrl: webhookUrl,
          voiceMethod: 'POST'
        });
        assignedNumber = purchasedNumber.phoneNumber;
        console.log('✅ Phone number purchased and configured:', assignedNumber);
      } catch (twilioError) {
        console.error('Error purchasing specific number:', twilioError);
        // Fall back to purchasing any available number
        assignedNumber = await purchaseAnyAvailableNumber(webhookUrl);
      }
    } else {
      // Purchase any available number
      assignedNumber = await purchaseAnyAvailableNumber(webhookUrl);
    }
    
    // Save user data to Firestore with enhanced profile tracking
    const userData = {
      userId,
      email: userEmail,
      name: userName,
      phoneNumber: assignedNumber,
      voiceAgentConfig: {
        name: 'AI Receptionist',
        greeting: `Hello! You've reached ${userName || 'our office'}. How can I help you today?`,
        businessHours: '9:00 AM - 5:00 PM',
        enabled: true
      },
      profile: {
        createdAt: existingData?.profile?.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        phoneNumberHistory: [
          ...(existingData?.profile?.phoneNumberHistory || []),
          {
            phoneNumber: assignedNumber,
            assignedAt: new Date().toISOString(),
            country: req.body.country || 'US',
            areaCode: assignedNumber.replace(/\D/g, '').slice(1, 4) // Extract area code
          }
        ]
      },
      assignedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    console.log('💾 Saving user data to Firestore:', { userId, phoneNumber: assignedNumber });
    await db.collection('users').doc(userId).set(userData, { merge: true });
    console.log('✅ Successfully saved user data to Firestore');
    
    res.json({
      success: true,
      data: userData,
      message: 'Phone number assigned successfully'
    });
    
  } catch (error) {
    console.error('Error assigning phone number:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign phone number',
      details: error.message 
    });
  }
});

// Helper function to purchase any available number
async function purchaseAnyAvailableNumber(webhookUrl) {
  try {
    // Get available numbers
    const availableNumbers = await twilioClient.availablePhoneNumbers('US')
      .local
      .list({ limit: 1 });
    
    if (availableNumbers.length === 0) {
      throw new Error('No available phone numbers');
    }
    
    // Purchase the first available number
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });
    
    console.log('✅ Phone number purchased and configured:', purchasedNumber.phoneNumber);
    return purchasedNumber.phoneNumber;
  } catch (error) {
    console.error('Error purchasing any available number:', error);
    throw error;
  }
}

// Get user data (with mock data fallback)
app.get('/api/user-data/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 getUserData request:', { 
      requestedUserId: userId, 
      tokenUserId: req.user.uid,
      isDevMode 
    });
    
    // Verify the requesting user is the same as the data being requested
    if (req.user.uid !== userId) {
      console.log('❌ Unauthorized: token user !== requested user');
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (isDevMode) {
      console.log('📝 Using mock data for getUserData');
      const userData = mockUsers.get(userId);
      return res.json({
        success: true,
        data: userData || null,
        devMode: true
      });
    }
    
    console.log('🔥 Fetching user data from Firestore for userId:', userId);
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      console.log('✅ Found user data in Firestore');
      res.json({
        success: true,
        data: userDoc.data()
      });
    } else {
      console.log('❌ No user data found in Firestore for userId:', userId);
      res.json({
        success: true,
        data: null
      });
    }
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user data',
      details: error.message 
    });
  }
});

// Get user profile with phone number history
app.get('/api/user-profile/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the requesting user is the same as the data being requested
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (isDevMode) {
      const userData = mockUsers.get(userId);
      return res.json({
        success: true,
        data: userData || null,
        devMode: true
      });
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      res.json({
        success: true,
        data: {
          ...userData,
          profile: userData.profile || {
            createdAt: userData.assignedAt,
            phoneNumberHistory: userData.phoneNumber ? [{
              phoneNumber: userData.phoneNumber,
              assignedAt: userData.assignedAt,
              country: 'US'
            }] : []
          }
        }
      });
    } else {
      res.json({
        success: true,
        data: null
      });
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user profile',
      details: error.message 
    });
  }
});

// Update voice agent configuration
app.put('/api/voice-config/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { voiceAgentConfig } = req.body;
    
    // Verify the requesting user is the same as the data being updated
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (isDevMode) {
      // Update mock user data
      const userData = mockUsers.get(userId);
      if (userData) {
        userData.voiceAgentConfig = voiceAgentConfig;
        userData.lastUpdated = new Date().toISOString();
        mockUsers.set(userId, userData);
        saveMockUsers(); // Persist to file
      }
      
      return res.json({
        success: true,
        data: voiceAgentConfig,
        message: 'Voice agent configuration updated and saved (dev mode)',
        devMode: true
      });
    }
    
    await db.collection('users').doc(userId).update({
      voiceAgentConfig,
      lastUpdated: new Date().toISOString(),
      'profile.lastConfigUpdate': new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: voiceAgentConfig,
      message: 'Voice agent configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating voice config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update voice configuration',
      details: error.message 
    });
  }
});

// Complete setup guide
app.post('/api/complete-setup', verifyToken, async (req, res) => {
  try {
    const { userId, setupCompleted, completedAt } = req.body;
    
    // Verify the requesting user is the same as the data being updated
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (isDevMode) {
      // Update mock user data
      const userData = mockUsers.get(userId);
      if (userData) {
        userData.setupCompleted = setupCompleted;
        userData.setupCompletedAt = completedAt;
        userData.lastUpdated = new Date().toISOString();
        mockUsers.set(userId, userData);
        saveMockUsers(); // Persist to file
      }
      
      return res.json({
        success: true,
        message: 'Setup completion saved and persisted (dev mode)',
        devMode: true
      });
    }
    
    // Update user document in Firestore
    await db.collection('users').doc(userId).update({
      setupCompleted,
      setupCompletedAt: completedAt,
      lastUpdated: new Date().toISOString(),
      'profile.setupCompletedAt': completedAt
    });
    
    console.log('✅ Setup completion saved for user:', userId);
    
    res.json({
      success: true,
      message: 'Setup completion saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving setup completion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save setup completion',
      details: error.message 
    });
  }
});

// Update webhook URL for existing phone numbers
app.post('/api/update-webhook/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the requesting user is the same as the data being updated
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!twilioClient) {
      return res.status(400).json({ 
        error: 'Twilio not configured',
        devMode: true 
      });
    }
    
    // Get user's phone number
    let userData = null;
    if (isDevMode) {
      userData = mockUsers.get(userId);
    } else {
      const userDoc = await db.collection('users').doc(userId).get();
      userData = userDoc.exists ? userDoc.data() : null;
    }
    
    if (!userData || !userData.phoneNumber) {
      return res.status(404).json({ error: 'No phone number found for user' });
    }
    
    // Get current webhook URL
    const webhookUrl = await ngrokHelper.getWebhookUrl();
    console.log('🔗 Updating webhook URL to:', webhookUrl);
    
    // Find the Twilio phone number resource
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber: userData.phoneNumber
    });
    
    if (phoneNumbers.length === 0) {
      return res.status(404).json({ error: 'Phone number not found in Twilio account' });
    }
    
    // Update the webhook URL
    const phoneNumberSid = phoneNumbers[0].sid;
    await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });
    
    console.log('✅ Webhook URL updated for phone number:', userData.phoneNumber);
    
    res.json({
      success: true,
      phoneNumber: userData.phoneNumber,
      webhookUrl,
      message: 'Webhook URL updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating webhook URL:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update webhook URL',
      details: error.message 
    });
  }
});

// Twilio Voice Webhook - handles incoming calls with AI
app.post('/api/voice-webhook', async (req, res) => {
  try {
    const { To, From, CallSid, SpeechResult, Digits } = req.body;
    
    console.log(`Incoming call: ${From} -> ${To}, CallSid: ${CallSid}`);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    // Validate required Twilio parameters
    if (!To || !From || !CallSid) {
      console.error('Missing required Twilio parameters:', { To, From, CallSid });
      // Return a basic TwiML response for invalid requests
      const basicTwiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Thank you for calling. Please try again later.</Say>
        </Response>`;
      res.type('text/xml');
      return res.send(basicTwiml);
    }
    
    let userData = null;
    let isEnabled = true;
    
    // Find user by phone number
    if (db && !isDevMode && To) {
      try {
        const userQuery = await db.collection('users')
          .where('phoneNumber', '==', To)
          .limit(1)
          .get();
        
        if (!userQuery.empty) {
          userData = userQuery.docs[0].data();
          console.log('Found user data:', userData);
        } else {
          console.log('No user found for phone number:', To);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue with default behavior
      }
    } else {
      console.log('Using mock mode or no database connection');
      // Mock user data for development
      userData = {
        voiceAgentConfig: {
          name: 'AI Receptionist',
          greeting: 'Hello! Thank you for calling our office. How can I help you today?',
          businessHours: '9:00 AM - 5:00 PM',
          enabled: true
        }
      };
    }
    
    isEnabled = userData?.voiceAgentConfig?.enabled !== false;
    
    if (!isEnabled) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Thank you for calling. We are currently unavailable. Please try again later.</Say>
        </Response>`;
      res.type('text/xml');
      return res.send(twiml);
    }
    
    // Get or create conversation
    let conversation = activeConversations.get(CallSid) || {
      callSid: CallSid,
      phoneNumber: To,
      callerNumber: From,
      messages: [],
      startTime: new Date().toISOString(),
      userData: userData
    };
    
    let aiResponse = '';
    let shouldContinue = true;
    
    if (SpeechResult) {
      // Process speech input with AI
      console.log(`Speech input: ${SpeechResult}`);
      
      if (aiService) {
        try {
          console.log('⚡ Generating AI response...');
          const startTime = Date.now();
          
          const aiResult = await aiService.generateResponse(SpeechResult, {
            businessName: userData?.voiceAgentConfig?.businessName || userData?.name || 'our office',
            businessHours: userData?.voiceAgentConfig?.businessHours || '9:00 AM - 5:00 PM',
            customInstructions: userData?.voiceAgentConfig?.customInstructions || '',
            conversationHistory: conversation.messages,
            userProfile: userData?.profile || {}
          });
          
          console.log(`⚡ AI response generated in ${Date.now() - startTime}ms`);
          
          if (aiResult.success) {
            aiResponse = aiResult.response;
            
            // Add to conversation history
            conversation.messages.push(
              { role: 'user', content: SpeechResult },
              { role: 'assistant', content: aiResponse }
            );
            
            // Check if conversation should end
            const lowerResponse = aiResponse.toLowerCase();
            if (lowerResponse.includes('goodbye') || lowerResponse.includes('thank you for calling') || lowerResponse.includes('have a great day')) {
              shouldContinue = false;
            }
          } else {
            console.error('AI generation failed:', aiResult.error);
            aiResponse = "I apologize, but I'm having trouble understanding. Could you please repeat that?";
          }
        } catch (aiError) {
          console.error('AI service error:', aiError);
          aiResponse = "Thank you for calling. How can I help you today?";
        }
      } else {
        console.log('AI service not available, using fallback response');
        aiResponse = "Thank you for calling. How can I help you today?";
      }
    } else {
      // Initial greeting
      aiResponse = userData?.voiceAgentConfig?.greeting || 
        `Hello! Thank you for calling ${userData?.voiceAgentConfig?.businessName || 'our office'}. How can I help you today?`;
      
      conversation.messages.push({ role: 'assistant', content: aiResponse });
      console.log('Initial greeting:', aiResponse);
    }
    
    // Update conversation
    activeConversations.set(CallSid, conversation);
    
    // Generate voice audio using ElevenLabs (optimized for speed, no fallback)
    let audioUrl = null;
    
    if (aiService && aiResponse) {
      try {
        console.log('🎤 Generating voice with ElevenLabs...');
        const voiceStartTime = Date.now();
        
        const voiceId = userData?.voiceAgentConfig?.voiceSettings?.voiceId || 'EXAVITQu4vr4xnSDxMaL';
        const voiceSettings = userData?.voiceAgentConfig?.voiceSettings || {
          stability: 0.3, // Lower for speed
          similarity_boost: 0.6, // Lower for speed
          style: 0.0,
          use_speaker_boost: false // Disable for speed
        };
        
        const speechResult = await aiService.textToSpeech(aiResponse, voiceId, voiceSettings);
        const voiceTime = Date.now() - voiceStartTime;
        console.log(`🎤 Voice synthesis completed in ${voiceTime}ms`);
        
        if (speechResult.success) {
          // Save audio file temporarily and create a URL for Twilio to access
          const fs = require('fs');
          const path = require('path');
          const audioFilename = `voice_${CallSid}_${Date.now()}.mp3`;
          const tempDir = path.join(__dirname, 'temp');
          const audioPath = path.join(tempDir, audioFilename);
          
          // Ensure temp directory exists
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Save audio file
          fs.writeFileSync(audioPath, speechResult.audioBuffer);
          
          // Create public URL for Twilio to access
          const baseUrl = await ngrokHelper.getCurrentNgrokUrl();
          audioUrl = `${baseUrl}/api/audio/${audioFilename}`;
          
          console.log('✅ ElevenLabs audio generated and saved:', audioUrl);
        } else {
          console.error('❌ ElevenLabs synthesis failed:', speechResult.error);
          // Still use ElevenLabs, just log the error
        }
      } catch (voiceError) {
        console.error('❌ Voice synthesis error:', voiceError);
        // Still try to use ElevenLabs, don't fall back
      }
    }

    // Generate TwiML response (always use ElevenLabs, wait if needed)
    let twiml;
    if (shouldContinue) {
      if (audioUrl) {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Play>${audioUrl}</Play>
            <Gather input="speech" timeout="5" speechTimeout="2" action="/api/voice-webhook" method="POST" />
            <Say voice="alice">I didn't hear anything. Please call back if you need assistance. Goodbye!</Say>
          </Response>`;
      } else {
        // If ElevenLabs failed, wait a moment and try again or use a simple response
        console.log('⚠️ No audio URL available, using simple response');
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Pause length="1"/>
            <Gather input="speech" timeout="5" speechTimeout="2" action="/api/voice-webhook" method="POST" />
            <Say voice="alice">I didn't hear anything. Please call back if you need assistance. Goodbye!</Say>
            <Hangup/>
          </Response>`;
        
        // Also save conversation when no audio is available (call ending)
        if (conversation.messages.length > 0) {
          try {
            const conversationData = {
              ...conversation,
              endTime: new Date().toISOString(),
              duration: Math.round((new Date() - new Date(conversation.startTime)) / 1000),
              endReason: 'no_audio_timeout'
            };
            
            if (db && !isDevMode) {
              let userId = 'unknown';
              if (userData && To) {
                try {
                  const userQuery = await db.collection('users')
                    .where('phoneNumber', '==', To)
                    .limit(1)
                    .get();
                  
                  if (!userQuery.empty) {
                    userId = userQuery.docs[0].id;
                  }
                } catch (userError) {
                  console.error('Error finding user ID:', userError);
                }
              }
              
              conversationData.userId = userId;
              await db.collection('conversations').add(conversationData);
              console.log('✅ Timeout conversation saved to database');
            } else {
              // Save to memory in dev mode
              conversationData.userId = 'dev-user-123';
              conversationData.id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              savedConversations.set(conversationData.id, conversationData);
              console.log('✅ Timeout conversation saved to memory (dev mode)');
            }
            
            activeConversations.delete(CallSid);
          } catch (error) {
            console.error('❌ Error saving timeout conversation:', error);
          }
        }
      }
    } else {
      if (audioUrl) {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Play>${audioUrl}</Play>
            <Hangup/>
          </Response>`;
      } else {
        // End call gracefully even if no audio
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Pause length="1"/>
            <Hangup/>
          </Response>`;
      }
      
      // Save conversation to database or memory
      const conversationData = {
        ...conversation,
        endTime: new Date().toISOString(),
        duration: Math.round((new Date() - new Date(conversation.startTime)) / 1000),
        endReason: 'normal_end'
      };
      
      if (db && !isDevMode) {
        try {
          // Find the user ID from the database
          let userId = 'unknown';
          if (userData && To) {
            try {
              const userQuery = await db.collection('users')
                .where('phoneNumber', '==', To)
                .limit(1)
                .get();
              
              if (!userQuery.empty) {
                userId = userQuery.docs[0].id;
                console.log('Found userId for conversation:', userId);
              }
            } catch (userError) {
              console.error('Error finding user ID:', userError);
            }
          }
          
          conversationData.userId = userId;
          await db.collection('conversations').add(conversationData);
          console.log('✅ Conversation saved to database with userId:', userId);
        } catch (error) {
          console.error('❌ Error saving conversation:', error);
        }
      } else {
        // Save to memory in dev mode
        conversationData.userId = 'dev-user-123';
        conversationData.id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        savedConversations.set(conversationData.id, conversationData);
        console.log('✅ Conversation saved to memory (dev mode):', {
          id: conversationData.id,
          duration: conversationData.duration,
          messages: conversationData.messages.length
        });
      }
      
      // Clean up active conversation
      activeConversations.delete(CallSid);
    }
    
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error) {
    console.error('Error handling voice webhook:', error);
    
    // Default TwiML response
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">I apologize, but I'm experiencing technical difficulties. Please try again later.</Say>
      </Response>`;
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Train AI with business data
app.post('/api/train-ai/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { businessData } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!aiService) {
      return res.status(500).json({ error: 'AI service not available' });
    }
    
    console.log('Training AI for user:', userId);
    console.log('Business data:', JSON.stringify(businessData, null, 2));
    
    const trainingResult = await aiService.trainWithBusinessData(businessData);
    console.log('Training result:', trainingResult);
    
    if (trainingResult.success) {
      // Save training data to user profile
      if (isDevMode) {
        // In dev mode, just return success
        console.log('Dev mode: skipping database update');
      } else {
        await db.collection('users').doc(userId).update({
          'voiceAgentConfig.businessData': businessData,
          'voiceAgentConfig.customInstructions': trainingResult.trainingPrompt,
          'profile.lastTrainingUpdate': new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    res.json(trainingResult);
  } catch (error) {
    console.error('Error training AI:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to train AI',
      details: error.message 
    });
  }
});

// Get available ElevenLabs voices
app.get('/api/voices', verifyToken, async (req, res) => {
  try {
    if (!aiService) {
      return res.status(500).json({ error: 'AI service not available' });
    }
    
    const voicesResult = await aiService.getAvailableVoices();
    res.json(voicesResult);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch voices',
      details: error.message 
    });
  }
});

// Test voice synthesis
app.post('/api/test-voice', verifyToken, async (req, res) => {
  try {
    const { text, voiceId, voiceSettings } = req.body;
    
    if (!aiService) {
      return res.status(500).json({ error: 'AI service not available' });
    }
    
    const speechResult = await aiService.textToSpeech(text, voiceId, voiceSettings);
    
    if (speechResult.success) {
      res.set({
        'Content-Type': speechResult.contentType,
        'Content-Length': speechResult.audioBuffer.length
      });
      res.send(speechResult.audioBuffer);
    } else {
      res.status(500).json(speechResult);
    }
  } catch (error) {
    console.error('Error testing voice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test voice',
      details: error.message 
    });
  }
});

// Test phone number by making a call
app.post('/api/test-phone-number', verifyToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    // In dev mode without Twilio, return success with mock data
    if (!twilioClient) {
      console.log('📞 Mock test call to:', phoneNumber);
      return res.json({
        success: true,
        message: 'Test call initiated (mock mode)',
        phoneNumber: phoneNumber,
        mockMode: true
      });
    }

    // Get the webhook URL for the test call
    const webhookUrl = await ngrokHelper.getWebhookUrl();
    
    if (ngrokHelper.isLocalUrl(webhookUrl)) {
      console.warn('⚠️ Warning: Using localhost webhook URL for test call');
    }

    // Find user's assigned Twilio phone number to make the call from
    let fromNumber = null;
    try {
      // Find user data to get their assigned phone number
      const userData = isDevMode ? 
        { phoneNumber: '+12183664729' } : // Mock number in dev mode
        await (async () => {
          const userDoc = await db.collection('users').doc(req.user.uid).get();
          return userDoc.exists ? userDoc.data() : null;
        })();

      if (userData && userData.phoneNumber) {
        fromNumber = userData.phoneNumber;
      } else {
        // If no user phone number found, try to find any Twilio number
        const numbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
        if (numbers.length > 0) {
          fromNumber = numbers[0].phoneNumber;
        }
      }
    } catch (error) {
      console.error('Error finding from number:', error);
    }

    if (!fromNumber) {
      return res.status(500).json({
        success: false,
        error: 'No Twilio phone number available to make the call from'
      });
    }

    // Make the test call using Twilio
    const call = await twilioClient.calls.create({
      from: fromNumber,
      to: phoneNumber,
      url: webhookUrl,
      method: 'POST',
      record: false, // Don't record test calls
      timeout: 30, // 30 second timeout
      statusCallback: `${webhookUrl.replace('/api/voice-webhook', '/api/call-status')}`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    console.log('📞 Test call initiated:', {
      callSid: call.sid,
      from: fromNumber,
      to: phoneNumber,
      status: call.status
    });

    res.json({
      success: true,
      message: 'Test call initiated successfully',
      callSid: call.sid,
      from: fromNumber,
      to: phoneNumber,
      status: call.status
    });

  } catch (error) {
    console.error('Error initiating test call:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to initiate test call';
    if (error.code === 21212) {
      errorMessage = 'Invalid phone number format';
    } else if (error.code === 21217) {
      errorMessage = 'Phone number is not available for calling';
    } else if (error.code === 21402) {
      errorMessage = 'Invalid webhook URL - please check ngrok setup';
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: error.message,
      code: error.code
    });
  }
});

// Get conversation history
app.get('/api/conversations/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (isDevMode) {
      // Return conversations from memory in dev mode
      const conversations = Array.from(savedConversations.values())
        .filter(conv => conv.userId === userId)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, parseInt(limit));
      
      return res.json({
        success: true,
        conversations: conversations,
        devMode: true
      });
    }
    
    // Use a simpler query without orderBy to avoid index requirement
    const conversationsQuery = await db.collection('conversations')
      .where('userId', '==', userId)
      .limit(parseInt(limit))
      .get();
    
    const conversations = conversationsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort on client side to avoid index requirement
    conversations.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversations',
      details: error.message 
    });
  }
});

// Analyze conversation
app.post('/api/analyze-conversation', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    if (!aiService) {
      return res.status(500).json({ error: 'AI service not available' });
    }
    
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversationDoc.data();
    
    // Verify user owns this conversation
    if (conversation.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const analysisResult = await aiService.analyzeConversation(conversation.messages);
    
    res.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze conversation',
      details: error.message 
    });
  }
});

// Serve audio files for Twilio
app.get('/api/audio/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^voice_[a-zA-Z0-9_-]+\.mp3$/)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const audioPath = path.join(__dirname, 'temp', filename);
    
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    // Set appropriate headers for audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    // Stream the audio file
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);
    
    // Clean up file after serving (optional - you might want to keep for caching)
    audioStream.on('end', () => {
      setTimeout(() => {
        try {
          fs.unlinkSync(audioPath);
          console.log('🗑️ Cleaned up audio file:', filename);
        } catch (error) {
          console.error('Error cleaning up audio file:', error);
        }
      }, 60000); // Delete after 1 minute
    });
    
  } catch (error) {
    console.error('Error serving audio file:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Debug endpoint to manually save a test conversation
app.post('/api/debug/test-conversation/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const testConversation = {
      callSid: `test_${Date.now()}`,
      phoneNumber: '+12183664729', // Your phone number
      callerNumber: '+15551234567',
      messages: [
        { role: 'assistant', content: 'Hello! Thank you for calling. How can I help you today?' },
        { role: 'user', content: 'Hi, I wanted to ask about your services.' },
        { role: 'assistant', content: 'I\'d be happy to help you with information about our services.' }
      ],
      startTime: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      endTime: new Date().toISOString(),
      duration: 60,
      userId: userId,
      endReason: 'test_conversation'
    };
    
    if (db && !isDevMode) {
      await db.collection('conversations').add(testConversation);
      res.json({ success: true, message: 'Test conversation saved', conversation: testConversation });
    } else {
      res.json({ success: false, message: 'Database not available or in dev mode', conversation: testConversation });
    }
  } catch (error) {
    console.error('Error saving test conversation:', error);
    res.status(500).json({ error: 'Failed to save test conversation', details: error.message });
  }
});

// Debug endpoint to view active conversations
app.get('/api/debug/active-conversations', (req, res) => {
  const conversations = Array.from(activeConversations.entries()).map(([callSid, conversation]) => ({
    callSid,
    startTime: conversation.startTime,
    age: Math.round((Date.now() - new Date(conversation.startTime).getTime()) / 1000),
    messages: conversation.messages.length,
    callerNumber: conversation.callerNumber,
    phoneNumber: conversation.phoneNumber
  }));
  
  res.json({
    activeConversations: conversations,
    count: conversations.length
  });
});

// Debug endpoint to manually trigger cleanup
app.post('/api/debug/cleanup', (req, res) => {
  const now = Date.now();
  const orphanedConversations = [];
  
  // Find conversations older than 30 seconds for manual cleanup
  for (const [callSid, conversation] of activeConversations.entries()) {
    const conversationAge = now - new Date(conversation.startTime).getTime();
    if (conversationAge > 30000) { // 30 seconds for manual cleanup
      orphanedConversations.push([callSid, conversation]);
    }
  }
  
  res.json({
    message: `Found ${orphanedConversations.length} conversations to clean up`,
    conversations: orphanedConversations.map(([callSid, conv]) => ({
      callSid,
      age: Math.round((now - new Date(conv.startTime).getTime()) / 1000),
      messages: conv.messages.length
    }))
  });
  
  // Trigger cleanup for these conversations
  orphanedConversations.forEach(async ([callSid, conversation]) => {
    try {
      console.log(`🧹 Manual cleanup for conversation: ${callSid}`);
      
      const conversationData = {
        ...conversation,
        endTime: new Date().toISOString(),
        duration: Math.round((now - new Date(conversation.startTime).getTime()) / 1000),
        endReason: 'manual_cleanup'
      };
      
      if (db && !isDevMode) {
        // Find userId for database save
        let userId = 'unknown';
        try {
          const userQuery = await db.collection('users')
            .where('phoneNumber', '==', conversation.phoneNumber)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            userId = userQuery.docs[0].id;
            conversationData.userId = userId;
            await db.collection('conversations').add(conversationData);
            console.log('✅ Manual cleanup conversation saved to database');
          } else {
            console.log('⚠️ No user found for phone number:', conversation.phoneNumber);
          }
        } catch (error) {
          console.error('❌ Error saving manual cleanup conversation to database:', error);
        }
      } else {
        console.log('⚠️ Skipping database save - db:', !!db, 'devMode:', isDevMode);
      }
      
      activeConversations.delete(callSid);
    } catch (error) {
      console.error('❌ Error in manual cleanup:', error);
    }
  });
});

// Debug endpoint to check if user exists for phone number
app.get('/api/debug/check-user/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (db && !isDevMode) {
      const userQuery = await db.collection('users')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();
      
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data();
        res.json({
          found: true,
          userId: userQuery.docs[0].id,
          phoneNumber: userData.phoneNumber,
          name: userData.name,
          email: userData.email
        });
      } else {
        res.json({
          found: false,
          phoneNumber: phoneNumber,
          message: 'No user found for this phone number'
        });
      }
    } else {
      res.json({
        found: false,
        message: 'Database not available or in dev mode',
        db: !!db,
        devMode: isDevMode
      });
    }
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ 
      error: 'Failed to check user',
      details: error.message 
    });
  }
});

// Debug endpoint to manually save a conversation
app.post('/api/debug/save-conversation', async (req, res) => {
  try {
    const testConversation = {
      callSid: `manual_test_${Date.now()}`,
      phoneNumber: '+12183664729',
      callerNumber: '+16136009723',
      messages: [
        { role: 'assistant', content: 'Hello! Thank you for calling Georgio. How can I help you today?' },
        { role: 'user', content: 'Hi, I wanted to test the conversation tracking.' },
        { role: 'assistant', content: 'Great! This is a test conversation to verify the tracking system is working.' }
      ],
      startTime: new Date(Date.now() - 45000).toISOString(), // 45 seconds ago
      endTime: new Date().toISOString(),
      duration: 45,
      endReason: 'manual_test'
    };
    
    if (db && !isDevMode) {
      // Find userId for the phone number
      const userQuery = await db.collection('users')
        .where('phoneNumber', '==', testConversation.phoneNumber)
        .limit(1)
        .get();
      
      if (!userQuery.empty) {
        const userId = userQuery.docs[0].id;
        testConversation.userId = userId;
        
        const docRef = await db.collection('conversations').add(testConversation);
        console.log('✅ Manual test conversation saved to database with ID:', docRef.id);
        
        res.json({
          success: true,
          message: 'Test conversation saved successfully',
          conversationId: docRef.id,
          conversation: testConversation
        });
      } else {
        res.json({
          success: false,
          message: 'No user found for phone number',
          phoneNumber: testConversation.phoneNumber
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Database not available or in dev mode',
        db: !!db,
        devMode: isDevMode
      });
    }
  } catch (error) {
    console.error('Error saving manual test conversation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save test conversation',
      details: error.message 
    });
  }
});

// Stripe Integration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Checkout Session
app.post('/api/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const { priceId, userId, userEmail, planId, successUrl, cancelUrl } = req.body;
    
    // In dev mode, skip strict user ID validation since we use mock authentication
    if (!isDevMode && req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create or get customer
    let customer;
    try {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: userId,
            planId: planId
          }
        });
      }
    } catch (error) {
      console.error('Error creating/finding customer:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planId: planId
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId
        }
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Billing Portal Session
app.post('/api/create-billing-portal-session', verifyToken, async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Subscription Status
app.get('/api/subscription-status/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In dev mode, skip strict user ID validation since we use mock authentication
    if (!isDevMode && req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get user email to find customer
    let userEmail;
    if (isDevMode) {
      userEmail = req.user.email;
    } else {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      userEmail = userDoc.data().email;
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.json({ 
        hasSubscription: false, 
        message: 'No customer found' 
      });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active'
    });

    if (subscriptions.data.length === 0) {
      return res.json({ 
        hasSubscription: false, 
        customerId: customer.id,
        message: 'No active subscription' 
      });
    }

    const subscription = subscriptions.data[0];
    const planId = subscription.metadata.planId || 'unknown';

    res.json({
      hasSubscription: true,
      customerId: customer.id,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planId: planId,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Usage Record for Overage Billing
app.post('/api/create-usage-record', verifyToken, async (req, res) => {
  try {
    const { subscriptionItemId, quantity, timestamp } = req.body;

    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity: quantity,
        timestamp: timestamp,
        action: 'increment'
      }
    );

    res.json({ success: true, usageRecord });
  } catch (error) {
    console.error('Error creating usage record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Report Minute Usage
app.post('/api/report-usage', verifyToken, async (req, res) => {
  try {
    const { userId, minutesUsed, timestamp } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get user's subscription to determine plan limits
    const subscriptionStatus = await fetch(`${req.protocol}://${req.get('host')}/api/subscription-status/${userId}`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    
    const subData = await subscriptionStatus.json();
    
    if (!subData.hasSubscription) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Update usage in Firebase/database
    if (db && !isDevMode) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const currentUsage = userData.usage || { minutesUsed: 0 };
        const newMinutesUsed = (currentUsage.minutesUsed || 0) + minutesUsed;
        
        await userRef.update({
          'usage.minutesUsed': newMinutesUsed,
          'usage.lastUpdated': new Date().toISOString()
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Usage reported successfully',
      minutesUsed: minutesUsed,
      timestamp: timestamp
    });

  } catch (error) {
    console.error('Error reporting usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook Handler
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      
      case 'customer.subscription.created':
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;
      
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        await handleSubscriptionUpdated(updatedSubscription);
        break;
      
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionCanceled(deletedSubscription);
        break;
      
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handlePaymentFailed(failedInvoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook handler functions
async function handleSuccessfulPayment(session) {
  try {
    const userId = session.metadata.userId;
    const planId = session.metadata.planId;
    
    console.log('Payment successful for user:', userId, 'plan:', planId);
    
    // Update user's plan in database
    if (db && !isDevMode) {
      const planConfig = {
        starter: { minutesIncluded: 300, overageRate: 0.35 },
        professional: { minutesIncluded: 900, overageRate: 0.30 },
        enterprise: { minutesIncluded: 2400, overageRate: 0.25 }
      };
      
      const plan = planConfig[planId];
      if (plan) {
        await db.collection('users').doc(userId).update({
          'plan.id': planId,
          'plan.status': 'active',
          'plan.minutesIncluded': plan.minutesIncluded,
          'plan.overageRate': plan.overageRate,
          'plan.stripeCustomerId': session.customer,
          'plan.lastPayment': new Date().toISOString(),
          'usage.minutesUsed': 0,
          'usage.minutesRemaining': plan.minutesIncluded,
          'usage.currentBillingPeriodStart': new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        
        console.log('✅ User plan updated successfully');
      }
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
}

async function handleSubscriptionCanceled(subscription) {
  try {
    const userId = subscription.metadata.userId;
    console.log('Subscription canceled for user:', userId);
    
    if (db && !isDevMode) {
      await db.collection('users').doc(userId).update({
        'plan.status': 'canceled',
        'plan.canceledAt': new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Twilio configured:', !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN));
  console.log('Firebase configured:', !!(process.env.REACT_APP_FIREBASE_PROJECT_ID));
  console.log('Stripe configured:', !!(process.env.STRIPE_SECRET_KEY));
}); 