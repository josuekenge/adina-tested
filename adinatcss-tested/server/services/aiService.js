const OpenAI = require('openai');
const axios = require('axios');

class AIService {
  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ElevenLabs configuration
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    this.elevenLabsBaseUrl = 'https://api.elevenlabs.io/v1';
    
    // Default voice settings (optimized for speed and cost)
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Bella voice
    this.defaultVoiceSettings = {
      stability: 0.8,
      similarity_boost: 0.7,
      style: 0.0,
      use_speaker_boost: false // Disable for speed
    };
  }

  // Generate AI response using GPT
  async generateResponse(userMessage, context = {}) {
    try {
      const {
        businessName = 'our office',
        businessHours = '9:00 AM - 5:00 PM',
        customInstructions = '',
        conversationHistory = [],
        userProfile = {}
      } = context;

      // Build system prompt with training data
      const systemPrompt = this.buildSystemPrompt(businessName, businessHours, customInstructions, userProfile);

      // Prepare conversation messages (minimal context for speed)
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-4), // Keep only last 4 messages for speed
        { role: 'user', content: userMessage }
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // More cost-effective than GPT-3.5-turbo
        messages: messages,
        max_tokens: 40, // Even shorter for phone efficiency
        temperature: 0.2, // Lower for more consistent responses
        presence_penalty: 0,
        frequency_penalty: 0,
        stream: false // Ensure no streaming overhead
      });

      return {
        success: true,
        response: completion.choices[0].message.content.trim(),
        usage: completion.usage
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        success: false,
        error: error.message,
        response: "I apologize, but I'm having trouble processing your request right now. Please try again or hold for assistance."
      };
    }
  }

  // Build system prompt with custom training (optimized for speed)
  buildSystemPrompt(businessName, businessHours, customInstructions, userProfile) {
    const basePrompt = `You are ${businessName}'s AI receptionist. Be helpful and ULTRA BRIEF.

RULES:
- Max 15 words per response
- Direct answers only
- Unknown info: "I'll take a message"
- Hours: ${businessHours}
- Always ask "How can I help?"

${customInstructions ? customInstructions : ''}`;

    return basePrompt;
  }

  // Convert text to speech using ElevenLabs
  async textToSpeech(text, voiceId = null, voiceSettings = null) {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const selectedVoiceId = voiceId || this.defaultVoiceId;
      const selectedVoiceSettings = voiceSettings || this.defaultVoiceSettings;

      const response = await axios.post(
        `${this.elevenLabsBaseUrl}/text-to-speech/${selectedVoiceId}`,
        {
          text: text,
          model_id: 'eleven_turbo_v2_5', // Latest fastest model
          voice_settings: {
            ...selectedVoiceSettings,
            optimize_streaming_latency: 4, // Maximum speed optimization
            output_format: 'mp3_22050_32' // Lower quality for speed and cost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          responseType: 'arraybuffer',
          timeout: 5000 // Reduced timeout to 5 seconds
        }
      );

      return {
        success: true,
        audioBuffer: response.data,
        contentType: 'audio/mpeg'
      };
    } catch (error) {
      console.error('Error generating speech:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available ElevenLabs voices
  async getAvailableVoices() {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await axios.get(`${this.elevenLabsBaseUrl}/voices`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey
        }
      });

      return {
        success: true,
        voices: response.data.voices.map(voice => ({
          voice_id: voice.voice_id,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          preview_url: voice.preview_url,
          labels: voice.labels
        }))
      };
    } catch (error) {
      console.error('Error fetching voices:', error);
      return {
        success: false,
        error: error.message,
        voices: []
      };
    }
  }

  // Process phone call with full AI conversation
  async processPhoneCall(userInput, callContext = {}) {
    try {
      const {
        phoneNumber,
        callSid,
        conversationHistory = [],
        userConfig = {}
      } = callContext;

      // Generate AI response
      const aiResponse = await this.generateResponse(userInput, {
        businessName: userConfig.businessName || 'our office',
        businessHours: userConfig.businessHours || '9:00 AM - 5:00 PM',
        customInstructions: userConfig.customInstructions || '',
        conversationHistory: conversationHistory,
        userProfile: userConfig.profile || {}
      });

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error,
          response: aiResponse.response
        };
      }

      // Convert response to speech
      const speechResult = await this.textToSpeech(
        aiResponse.response,
        userConfig.voiceId,
        userConfig.voiceSettings
      );

      return {
        success: true,
        textResponse: aiResponse.response,
        audioBuffer: speechResult.success ? speechResult.audioBuffer : null,
        contentType: speechResult.contentType,
        usage: aiResponse.usage,
        callSid: callSid
      };
    } catch (error) {
      console.error('Error processing phone call:', error);
      return {
        success: false,
        error: error.message,
        response: "I apologize, but I'm experiencing technical difficulties. Please try again later."
      };
    }
  }

  // Train the AI with custom business information
  async trainWithBusinessData(businessData) {
    try {
      const {
        businessName,
        industry,
        services = [],
        faq = [],
        policies = [],
        customInstructions = ''
      } = businessData;

      // Create comprehensive training prompt
      const trainingPrompt = `
Business Training Data for AI Receptionist:

Business Name: ${businessName}
Industry: ${industry}

Services Offered:
${services.map(service => `- ${service.name}: ${service.description}`).join('\n')}

Frequently Asked Questions:
${faq.map(item => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n')}

Business Policies:
${policies.map(policy => `- ${policy.title}: ${policy.description}`).join('\n')}

Additional Instructions:
${customInstructions}

This information should be used to provide accurate, helpful responses to callers.
`;

      return {
        success: true,
        trainingPrompt: trainingPrompt,
        message: 'Business data processed for AI training'
      };
    } catch (error) {
      console.error('Error training AI with business data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Analyze conversation for insights
  async analyzeConversation(conversationHistory) {
    try {
      const conversationText = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Analyze this phone conversation and provide insights about the caller\'s intent, satisfaction, and any action items. Be concise and professional.'
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      return {
        success: true,
        analysis: completion.choices[0].message.content.trim(),
        usage: completion.usage
      };
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AIService; 