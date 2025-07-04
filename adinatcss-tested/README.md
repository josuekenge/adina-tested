# AI Voice Receptionist App

A complete React application with Twilio phone number assignment and Firebase authentication. Each user gets a real phone number connected to an AI voice agent.

## 🚀 Features

- 🔥 **Firebase Authentication** - Email/Password + Google Sign-In
- 📞 **Real Twilio Phone Numbers** - Each user gets a real phone number
- 🤖 **AI Voice Agent** - Customizable voice assistant for incoming calls
- 🎨 **Beautiful UI** - Modern Tailwind CSS design
- 📱 **Fully Responsive** - Works on all devices
- 🔧 **Full-Stack** - React frontend + Node.js backend

## 🏗️ Architecture

- **Frontend**: React 18 + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Voice**: Twilio Voice API
- **Phone Numbers**: Twilio Phone Number API

## 📋 Prerequisites

- Node.js 14+
- Firebase account
- Twilio account with funds for phone number purchases
- Git

## 🛠️ Quick Setup

### 1. Clone and Install

```bash
git clone https://github.com/ghostcoder1m/adinatcss.git
cd adinatcss
node setup.js
```

### 2. Firebase Configuration

#### Enable Services
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project or select existing one
3. **Authentication**: Enable Email/Password + Google
4. **Firestore**: Create database in test mode

#### Get Frontend Config
1. Project Settings → General → Your apps
2. Click web app icon (`</>`) if needed
3. Copy the config object values to `.env`:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
# ... etc
```

#### Generate Service Account (Backend)
1. Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download JSON file
4. Extract values to `.env`:

```env
FIREBASE_PRIVATE_KEY_ID=abc123
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

#### Set Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Twilio Configuration

1. Create account at [Twilio](https://www.twilio.com/)
2. Get Account SID & Auth Token from Console Dashboard
3. **Important**: Add funds to your account for phone number purchases
4. Add to `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
```

### 4. Environment Variables

Edit `.env` file with your actual values:

```env
# Firebase Frontend
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abc123
REACT_APP_FIREBASE_MEASUREMENT_ID=G-ABC123DEF4

# Firebase Backend
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789012345678901

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token

# Server
PORT=3001
BASE_URL=http://localhost:3001
```

## 🏃‍♂️ Running the Application

### Development (Full Stack)
```bash
npm run dev
```
This starts both frontend (port 3000) and backend (port 3001).

### Frontend Only
```bash
npm start
```

### Backend Only
```bash
npm run server
```

## 📞 How It Works

### Phone Number Assignment
1. User signs up/logs in
2. Backend calls Twilio API to purchase available phone number
3. Number is configured with webhook URL pointing to your server
4. User data saved to Firestore with assigned number

### Incoming Calls
1. Call comes to user's assigned Twilio number
2. Twilio sends webhook to `/api/voice-webhook`
3. Server looks up user by phone number
4. Returns TwiML with user's custom greeting
5. AI voice agent responds to caller

### Voice Agent Configuration
- Custom greeting message
- Business hours
- Agent name
- Enable/disable functionality

## 🔧 API Endpoints

### Authentication Required

- `GET /api/user-data/:userId` - Get user data
- `POST /api/assign-phone-number` - Assign phone number
- `PUT /api/voice-config/:userId` - Update voice config
- `GET /api/available-numbers` - Get available Twilio numbers

### Public

- `GET /api/health` - Server health check
- `POST /api/voice-webhook` - Twilio voice webhook

## 💰 Costs

### Twilio Pricing (US)
- **Phone Number**: ~$1/month per number
- **Voice Calls**: ~$0.0085/minute
- **SMS** (optional): ~$0.0075/message

### Firebase
- **Authentication**: Free for most usage
- **Firestore**: Free tier generous, paid plans available

## 🚀 Deployment

### Backend (Railway/Heroku/Digital Ocean)
1. Set environment variables
2. Deploy backend server
3. Update `REACT_APP_API_URL` in frontend

### Frontend (Netlify/Vercel)
1. Build: `npm run build`
2. Deploy `build` folder
3. Set environment variables

### Twilio Webhook Configuration
Update webhook URLs in Twilio Console to point to your deployed backend.

## 🔒 Security

- **Environment Variables**: Never commit `.env` to git
- **Firebase Rules**: Restrict access to user's own data
- **API Authentication**: All endpoints require valid Firebase token
- **Webhook Security**: Consider adding Twilio signature validation

## 🐛 Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check Firebase configuration
   - Verify user is signed in
   - Check token expiration

2. **"Failed to assign phone number"**
   - Verify Twilio credentials
   - Check account balance
   - Ensure phone numbers available in region

3. **"Server not responding"**
   - Check if backend is running on port 3001
   - Verify `.env` file exists and is configured
   - Check console for error messages

### Debug Mode
Set `NODE_ENV=development` to see detailed logs.

## 📖 Documentation

### Project Structure
```
src/
├── components/
│   ├── Login.js          # Authentication UI
│   └── Dashboard.js      # Main dashboard
├── services/
│   └── phoneService.js   # API integration
├── firebase.js           # Firebase config
└── index.js             # App entry point

server/
└── index.js             # Express server + Twilio integration
```

### Key Features
- **Real phone number assignment** via Twilio API
- **Voice webhook handling** for incoming calls
- **User authentication** with Firebase
- **Data persistence** with Firestore
- **Responsive design** with Tailwind CSS

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information for faster resolution

---

**⚠️ Important**: This app purchases real phone numbers from Twilio which incur costs. Monitor your Twilio usage and billing.

**🎉 Ready to go?** Run `npm run dev` and start building your AI voice receptionist! 