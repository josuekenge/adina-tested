#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up AI Voice Receptionist App...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from sample...');
  const envSamplePath = path.join(__dirname, 'env.sample');
  if (fs.existsSync(envSamplePath)) {
    fs.copyFileSync(envSamplePath, envPath);
    console.log('✅ .env file created! Please edit it with your configuration.\n');
  } else {
    console.log('❌ env.sample file not found!\n');
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!\n');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Display setup instructions
console.log('🔧 Setup Instructions:');
console.log('');
console.log('1. 🔥 Firebase Setup:');
console.log('   - Go to https://console.firebase.google.com/');
console.log('   - Create a new project or select existing one');
console.log('   - Enable Authentication (Email/Password + Google)');
console.log('   - Enable Firestore Database');
console.log('   - Get your config from Project Settings > General');
console.log('   - Generate a service account key from Service Accounts tab');
console.log('');
console.log('2. 📞 Twilio Setup:');
console.log('   - Go to https://www.twilio.com/');
console.log('   - Create account and get Account SID & Auth Token');
console.log('   - Add funds to your account for phone number purchases');
console.log('');
console.log('3. ⚙️ Environment Configuration:');
console.log('   - Edit the .env file with your actual values');
console.log('   - Replace all placeholder values');
console.log('');
console.log('4. 🏃‍♂️ Running the App:');
console.log('   - Frontend only: npm start');
console.log('   - Full stack: npm run dev');
console.log('   - Backend only: npm run server');
console.log('');
console.log('5. 🔒 Firestore Security Rules:');
console.log('   - Go to Firestore > Rules');
console.log('   - Replace with the rules from README.md');
console.log('');
console.log('📖 For detailed instructions, check the README.md file');
console.log('');
console.log('🎉 Setup complete! Edit your .env file and run "npm run dev" to start!'); 