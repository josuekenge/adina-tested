import React, { useState, useEffect } from 'react';
import { redirectToCheckout } from '../services/stripeService';
import '../FramerStyles.css';

const LandingPage = ({ user, onPlanSelected, devMode }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFakeCheckout, setShowFakeCheckout] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [fakeCardNumber, setFakeCardNumber] = useState('');
  const [fakeExpiry, setFakeExpiry] = useState('');
  const [fakeCvv, setFakeCvv] = useState('');
  const [fakeName, setFakeName] = useState('');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 119,
      description: 'Perfect for small businesses',
      minutes: 300,
      features: [
        '300 AI-handled minutes/month',
        '1 dedicated phone number',
        'Basic AI receptionist features',
        'Standard business hours setup',
        'Email support',
        'Basic analytics dashboard'
      ],
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 239,
      description: 'Ideal for growing businesses',
      minutes: 900,
      features: [
        '900 AI-handled minutes/month',
        '1 dedicated phone number',
        'Advanced AI features & custom voice',
        '24/7 availability',
        'Priority support',
        'Advanced analytics & insights',
        'Custom greetings & workflows'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 469,
      description: 'For high-volume businesses',
      minutes: 2400,
      features: [
        '2,400 AI-handled minutes/month',
        'Up to 3 phone numbers',
        'Premium AI features & voice clones',
        '24/7 priority routing',
        'Dedicated account manager',
        'Advanced integrations (CRM, calendar)',
        'Custom reporting & analytics'
      ],
      popular: false
    }
  ];

  const handlePlanSelect = async (plan) => {
    console.log('Plan selection started:', plan);
    
    // Check if user is properly authenticated
    if (!user || !user.uid || !user.email) {
      console.error('User not properly authenticated:', user);
      alert('Please sign in first to subscribe to a plan.');
      return;
    }
    
    // If dev mode, show fake checkout form
    if (devMode) {
      setSelectedPlanForCheckout(plan);
      setShowFakeCheckout(true);
      return;
    }
    
    setSelectedPlan(plan.id);
    setLoading(true);
    
    try {
      console.log('Calling redirectToCheckout with:', {
        planId: plan.id,
        userId: user.uid,
        userEmail: user.email
      });
      
      // Redirect to Stripe Checkout
      await redirectToCheckout(plan.id, user.uid, user.email);
      
      console.log('Redirecting to Stripe Checkout...');
      
    } catch (error) {
      console.error('Error processing payment:', error);
      alert(`Error processing payment: ${error.message}`);
      setSelectedPlan(null);
      setLoading(false);
    }
  };

  const handleFakePayment = async () => {
    if (!fakeCardNumber || !fakeExpiry || !fakeCvv || !fakeName) {
      alert('Please fill in all card details');
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      console.log('🎭 Fake payment processed for dev mode:', {
        plan: selectedPlanForCheckout,
        cardNumber: fakeCardNumber.slice(-4),
        user: user?.uid
      });
      
      onPlanSelected({
        ...selectedPlanForCheckout,
        devMode: true,
        paymentMethod: 'fake_card_' + fakeCardNumber.slice(-4)
      });
      
      setLoading(false);
      setShowFakeCheckout(false);
      window.location.reload();
    }, 2000);
  };

  useEffect(() => {
    // Add scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.framer-fade-in, .framer-slide-in, .framer-scale-in');
    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="framer-bg min-h-screen">

      {/* Navigation */}
      <nav className="framer-nav">
        <div className="framer-container">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="framer-heading-sm">ADINA</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="framer-nav-item">Features</a>
              <a href="#pricing" className="framer-nav-item">Pricing</a>
              <a href="#testimonials" className="framer-nav-item">Reviews</a>
              <a href="#about" className="framer-nav-item">About</a>
            </div>
            
            <div className="flex items-center space-x-3">
              {user ? (
                <span className="framer-text-sm">Welcome, {user.displayName || user.email}</span>
              ) : (
                <>
                  <div className="hidden lg:flex items-center space-x-2 mr-4">
                    <span className="framer-text-xs text-gray-600">📞 (555) 123-ADINA</span>
                    <span className="framer-text-xs text-gray-600">|</span>
                    <span className="framer-text-xs text-gray-600">contact@calladina.com</span>
                  </div>
                  <button className="framer-btn framer-btn-ghost">Live Demo</button>
                  <a 
                    href="https://calendly.com/contact-calladina/30min?preview_source=et_card&month=2025-06"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="framer-btn framer-btn-primary"
                  >
                    Book Now
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="framer-hero relative overflow-hidden">
        <div className="framer-hero-grid"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-100 rounded-full framer-float framer-delay-100 opacity-30"></div>
        <div className="absolute bottom-40 left-20 w-12 h-12 bg-blue-200 rounded-full framer-float framer-delay-500 opacity-40"></div>
        <div className="absolute top-32 right-16 w-8 h-8 bg-indigo-100 rounded-full framer-float framer-delay-700 opacity-50"></div>
        
        <div className="framer-container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="framer-fade-in">
              <h1 className="framer-heading-xl mb-8 relative z-10">
                Your AI Receptionist
                <br />
                <span className="framer-gradient-text-animated">Never Sleeps</span>
                <div className="absolute -top-4 -right-4 text-2xl framer-wiggle z-20">🤖</div>
              </h1>
              
              <p className="framer-text-lg mb-12 max-w-2xl mx-auto">
                Transform your business with ADINA - the AI-powered phone receptionist that handles calls 24/7, 
                schedules appointments, and represents your brand professionally.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <a 
                  href="https://calendly.com/contact-calladina/30min?preview_source=et_card&month=2025-06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="framer-btn framer-btn-primary text-lg px-8 py-4"
                >
                  Book Free Demo
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </a>
                <button 
                  onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                  className="framer-btn framer-btn-secondary text-lg px-8 py-4"
                >
                  View Pricing
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16 framer-text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Setup in under 24 hours</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>No contracts, cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="framer-fade-in framer-delay-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                <div className="framer-glass-enhanced p-6 rounded-2xl framer-scale-in framer-delay-100 hover:scale-105 transition-transform duration-300 group">
                  <div className="text-4xl mb-3 group-hover:framer-wiggle">📞</div>
                  <div className="framer-heading-md framer-gradient-text mb-2">847,392</div>
                  <div className="framer-text-md">Calls Processed in 2024</div>
                </div>
                <div className="framer-glass-enhanced p-6 rounded-2xl framer-scale-in framer-delay-200 hover:scale-105 transition-transform duration-300 group">
                  <div className="text-4xl mb-3 group-hover:framer-wiggle">🏢</div>
                  <div className="framer-heading-md framer-gradient-text mb-2">127</div>
                  <div className="framer-text-md">Businesses Across 15 Industries</div>
                </div>
                <div className="framer-glass-enhanced p-6 rounded-2xl framer-scale-in framer-delay-300 hover:scale-105 transition-transform duration-300 group">
                  <div className="text-4xl mb-3 group-hover:framer-wiggle">⚡</div>
                  <div className="framer-heading-md framer-gradient-text mb-2">2.3s</div>
                  <div className="framer-text-md">Average Answer Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transition 1 */}
      <div className="framer-gradient-divider"></div>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="framer-container">
          <div className="text-center mb-20">
            <h2 className="framer-heading-lg mb-6 framer-fade-in">
              Everything you need for
              <br />
              <span className="framer-gradient-text">professional phone service</span>
            </h2>
            <p className="framer-text-lg max-w-2xl mx-auto framer-fade-in framer-delay-100">
              ADINA handles your calls with human-like intelligence, learning your business 
              and providing exceptional customer service around the clock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'AI-Powered Intelligence',
                description: 'Advanced natural language processing understands context and responds appropriately to any inquiry.'
              },
              {
                icon: '📞',
                title: '24/7 Availability',
                description: 'Never miss a call again. ADINA works around the clock to ensure every customer reaches you.'
              },
              {
                icon: '📊',
                title: 'Analytics & Insights',
                description: 'Detailed call analytics help you understand customer needs and optimize your business.'
              },
              {
                icon: '🔧',
                title: 'Easy Integration',
                description: 'Seamlessly connects with your existing CRM, calendar, and business tools.'
              },
              {
                icon: '🎯',
                title: 'Custom Training',
                description: 'Train ADINA with your specific business information and customer service guidelines.'
              },
              {
                icon: '💎',
                title: 'Premium Voice Quality',
                description: 'Crystal-clear, natural-sounding voice that represents your brand professionally.'
              }
            ].map((feature, index) => (
              <div key={index} className={`framer-card p-8 framer-fade-in framer-delay-${(index + 1) * 100}`}>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="framer-heading-sm mb-4">{feature.title}</h3>
                <p className="framer-text-md">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transition 2 */}
      <div className="framer-divider-wave bg-gradient-to-br from-blue-50 to-indigo-100"></div>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 relative">
        <div className="framer-container">
          <div className="text-center mb-16">
            <h2 className="framer-heading-lg mb-6 framer-fade-in">
              Trusted by <span className="framer-gradient-text">growing businesses</span>
            </h2>
            <p className="framer-text-lg max-w-2xl mx-auto framer-fade-in framer-delay-100">
              See how ADINA transforms customer service for businesses like yours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="framer-glass-enhanced p-6 rounded-2xl framer-fade-in framer-delay-100">
              <div className="flex items-start mb-4">
                <div className="text-yellow-400 mr-2">★★★★★</div>
                <div className="framer-text-sm text-gray-600">4.9/5</div>
              </div>
              <p className="framer-text-md mb-4 italic">
                "ADINA increased our appointment bookings by 40% and we haven't missed a call since. Best investment we've made."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  M
                </div>
                <div>
                  <div className="framer-text-sm font-bold">Maria Rodriguez</div>
                  <div className="framer-text-xs text-gray-600">Bella Vista Restaurant</div>
                </div>
              </div>
            </div>

            <div className="framer-glass-enhanced p-6 rounded-2xl framer-fade-in framer-delay-200">
              <div className="flex items-start mb-4">
                <div className="text-yellow-400 mr-2">★★★★★</div>
                <div className="framer-text-sm text-gray-600">5.0/5</div>
              </div>
              <p className="framer-text-md mb-4 italic">
                "Cut our reception costs by 60% while improving patient satisfaction. ADINA never gets tired or forgets protocols."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  D
                </div>
                <div>
                  <div className="framer-text-sm font-bold">Dr. James Chen</div>
                  <div className="framer-text-xs text-gray-600">Westside Medical Group</div>
                </div>
              </div>
            </div>

            <div className="framer-glass-enhanced p-6 rounded-2xl framer-fade-in framer-delay-300">
              <div className="flex items-start mb-4">
                <div className="text-yellow-400 mr-2">★★★★★</div>
                <div className="framer-text-sm text-gray-600">4.8/5</div>
              </div>
              <p className="framer-text-md mb-4 italic">
                "Clients love the 24/7 availability. ADINA handles initial consultations better than our previous receptionist."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  S
                </div>
                <div>
                  <div className="framer-text-sm font-bold">Sarah Mitchell</div>
                  <div className="framer-text-xs text-gray-600">Mitchell & Associates Law</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12 framer-fade-in framer-delay-400">
            <div className="flex flex-wrap justify-center items-center gap-8 framer-text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">🔒</span>
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">🔐</span>
                <span>256-bit SSL Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">🛡️</span>
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">⚡</span>
                <span>99.9% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-32 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="framer-container relative z-10">
          <div className="text-center mb-20">
            <h2 className="framer-heading-lg mb-6 framer-fade-in">
              Seamless Integrations
            </h2>
            <p className="framer-text-lg max-w-2xl mx-auto framer-fade-in framer-delay-100">
              ADINA connects with your favorite tools and platforms to streamline your workflow
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            {/* Integration Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
              
              {/* CRM & Sales */}
              <div className="framer-fade-in framer-delay-100">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 framer-pulse">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    </svg>
                  </div>
                  <h3 className="framer-heading-sm mb-2">CRM & Sales</h3>
                  <p className="framer-text-sm text-gray-600">Sync call data with your customer records</p>
                </div>
                
                <div className="space-y-4">
                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-blue-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">SF</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Salesforce</div>
                        <div className="framer-text-xs text-gray-600">Auto-create leads, log calls, update opportunities</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-orange-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">H</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">HubSpot</div>
                        <div className="framer-text-xs text-gray-600">Sync contacts, deals, and conversation history</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-purple-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">P</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Pipedrive</div>
                        <div className="framer-text-xs text-gray-600">Track sales pipeline and call outcomes</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Communication & Scheduling */}
              <div className="framer-fade-in framer-delay-200">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 framer-pulse">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="framer-heading-sm mb-2">Scheduling & Communication</h3>
                  <p className="framer-text-sm text-gray-600">Book appointments and notify your team</p>
                </div>
                
                <div className="space-y-4">
                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-blue-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">C</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Calendly</div>
                        <div className="framer-text-xs text-gray-600">Automatically book appointments during calls</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-purple-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">S</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Slack</div>
                        <div className="framer-text-xs text-gray-600">Get instant notifications of important calls</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-green-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">G</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Google Calendar</div>
                        <div className="framer-text-xs text-gray-600">Sync appointments with your calendar</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Tools */}
              <div className="framer-fade-in framer-delay-300">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 framer-pulse">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="framer-heading-sm mb-2">Business Automation</h3>
                  <p className="framer-text-sm text-gray-600">Automate workflows and payments</p>
                </div>
                
                <div className="space-y-4">
                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-orange-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">Z</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Zapier</div>
                        <div className="framer-text-xs text-gray-600">Connect to 5000+ apps with custom workflows</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-purple-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">S</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Stripe</div>
                        <div className="framer-text-xs text-gray-600">Process payments and send invoices</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="framer-glass-enhanced p-6 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 group border border-red-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">T</span>
                      </div>
                      <div className="flex-1">
                        <div className="framer-text-sm font-bold mb-1">Twilio</div>
                        <div className="framer-text-xs text-gray-600">Enterprise phone infrastructure</div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <span className="framer-text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Stats */}
            <div className="framer-glass-enhanced p-8 rounded-2xl text-center framer-fade-in framer-delay-400">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <div className="framer-heading-md framer-gradient-text mb-2">9</div>
                  <div className="framer-text-sm text-gray-600">Active Integrations</div>
                </div>
                <div>
                  <div className="framer-heading-md framer-gradient-text mb-2">5000+</div>
                  <div className="framer-text-sm text-gray-600">Available via Zapier</div>
                </div>
                <div>
                  <div className="framer-heading-md framer-gradient-text mb-2">&lt; 5min</div>
                  <div className="framer-text-sm text-gray-600">Setup Time</div>
                </div>
                <div>
                  <div className="framer-heading-md framer-gradient-text mb-2">24/7</div>
                  <div className="framer-text-sm text-gray-600">Sync Monitoring</div>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Connection Lines */}
          <div className="relative h-32 framer-fade-in framer-delay-400">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-16 bg-white rounded-full border-4 border-blue-200 flex items-center justify-center framer-pulse">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                </div>
                
                {/* Orbiting dots */}
                <div className="absolute inset-0">
                  <div className="w-4 h-4 bg-blue-400 rounded-full framer-orbit"></div>
                </div>
                <div className="absolute inset-0" style={{ animationDelay: '5s' }}>
                  <div className="w-3 h-3 bg-purple-400 rounded-full framer-orbit"></div>
                </div>
                <div className="absolute inset-0" style={{ animationDelay: '10s' }}>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full framer-orbit"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="framer-text-md framer-fade-in framer-delay-500">
              Connect with 12+ popular business tools and platforms
            </p>
            <div className="mt-4 framer-text-sm text-gray-600">
              Need a specific integration? <a href="mailto:contact@calladina.com" className="text-blue-600 hover:underline">Contact us</a> for custom development.
            </div>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 framer-morph"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-indigo-200 rounded-full opacity-30 framer-morph" style={{ animationDelay: '4s' }}></div>
      </section>

      {/* Transition 3 */}
      <div className="framer-divider-curve bg-white"></div>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-white">
        <div className="framer-container">
          <div className="text-center mb-20">
            <h2 className="framer-heading-lg mb-6 framer-fade-in">
              Simple, transparent pricing
            </h2>
            <p className="framer-text-lg max-w-2xl mx-auto framer-fade-in framer-delay-100">
              Choose the perfect plan for your business. Professional AI phone reception 
              that scales with your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={plan.id} 
                className={`framer-pricing-card framer-fade-in framer-delay-${(index + 1) * 100} ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && (
                  <div className="framer-popular-badge">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="framer-heading-sm mb-2">{plan.name}</h3>
                  <p className="framer-text-md mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="framer-heading-lg">${plan.price}</span>
                    <span className="framer-text-md ml-2">/month CAD</span>
                  </div>
                  
                  <div className="framer-text-sm mb-4">
                    {plan.minutes} minutes included monthly
                  </div>
                  <div className="framer-text-xs text-gray-600 mb-6">
                    Additional minutes: ${plan.id === 'starter' ? '0.47' : plan.id === 'professional' ? '0.40' : '0.34'} CAD each
                    <br />
                    Typical total cost: ${plan.id === 'starter' ? '$140-180' : plan.id === 'professional' ? '$280-350' : '$520-650'}/month
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="framer-feature">
                      <div className="framer-feature-icon"></div>
                      <span className="framer-text-md">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-4 ${plan.popular ? 'framer-btn-primary' : 'framer-btn-secondary'} framer-btn`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <div className="flex items-center justify-center">
                      <div className="framer-spinner mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      {devMode && <span className="mr-2">🔧</span>}
                      Get {plan.name}
                      {devMode && <span className="ml-2 text-xs opacity-75">(Dev)</span>}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-16 framer-fade-in framer-delay-400">
            <div className="framer-glass-enhanced p-6 rounded-2xl mb-8">
              <h3 className="framer-heading-sm mb-4 text-center">Perfect for these industries:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 framer-text-sm text-center">
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-2">🍽️</span>
                  <span>Restaurants</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-2">⚖️</span>
                  <span>Legal Firms</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-2">🏥</span>
                  <span>Healthcare</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-2">🏠</span>
                  <span>Real Estate</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-6 framer-text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                30-day money-back guarantee
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Setup in under 24 hours
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                No contracts, cancel anytime
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Only 50 spots available this quarter
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transition 4 */}
      <div className="framer-gradient-divider"></div>

      {/* About Section */}
      <section id="about" className="py-32 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="framer-container relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-20">
            <h2 className="framer-heading-lg mb-6 framer-fade-in">
              About ADINA
            </h2>
            <p className="framer-text-lg mb-8 framer-fade-in framer-delay-100">
              Founded by former telecommunications and AI professionals in Q2 2024, ADINA is revolutionizing 
              business communications with AI-powered phone reception that never sleeps.
            </p>
            <div className="flex flex-wrap justify-center gap-6 framer-text-sm mb-8">
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">🏢</span>
                <span>Headquarters: Toronto, Canada</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">🚀</span>
                <span>Y Combinator W24</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">☁️</span>
                <span>Google Cloud Partner</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="framer-fade-in framer-delay-200">
              <h3 className="framer-heading-md mb-6">Our Mission</h3>
              <p className="framer-text-md mb-8">
                We believe every business deserves exceptional phone service that scales with their growth. 
                ADINA empowers businesses to provide 24/7 professional reception without the overhead 
                of traditional staffing solutions.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                    <span className="text-white text-sm font-bold">🎯</span>
                  </div>
                  <div>
                    <h4 className="framer-heading-sm mb-2">Always Professional</h4>
                    <p className="framer-text-md">Every interaction reflects your brand's values and maintains consistency.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                    <span className="text-white text-sm font-bold">⚡</span>
                  </div>
                  <div>
                    <h4 className="framer-heading-sm mb-2">Instant Response</h4>
                    <p className="framer-text-md">No more missed calls or lengthy hold times for your customers.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                    <span className="text-white text-sm font-bold">🧠</span>
                  </div>
                  <div>
                    <h4 className="framer-heading-sm mb-2">Smart Learning</h4>
                    <p className="framer-text-md">ADINA learns your business and improves with every interaction.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="framer-fade-in framer-delay-300">
              <div className="framer-glass-enhanced p-8 rounded-2xl">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 framer-pulse">
                    <span className="text-2xl font-bold text-white">A</span>
                  </div>
                  <h3 className="framer-heading-sm mb-2">Built for Growth</h3>
                  <p className="framer-text-md">From startups to enterprises, ADINA scales with your business needs.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="framer-card p-4">
                    <div className="framer-heading-md framer-gradient-text mb-2">Q2 2024</div>
                    <div className="framer-text-sm">Founded</div>
                  </div>
                  <div className="framer-card p-4">
                    <div className="framer-heading-md framer-gradient-text mb-2">127</div>
                    <div className="framer-text-sm">Active Clients</div>
                  </div>
                  <div className="framer-card p-4">
                    <div className="framer-heading-md framer-gradient-text mb-2">96%</div>
                    <div className="framer-text-sm">Customer Satisfaction</div>
                  </div>
                  <div className="framer-card p-4">
                    <div className="framer-heading-md framer-gradient-text mb-2">&lt; 24hr</div>
                    <div className="framer-text-sm">Setup Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 framer-morph"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-indigo-200 rounded-full opacity-30 framer-morph" style={{ animationDelay: '3s' }}></div>
      </section>

      {/* Transition 5 */}
      <div className="framer-divider-curve bg-white"></div>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="framer-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="framer-heading-lg mb-6 framer-fade-in">
              Ready to revolutionize your phone service?
            </h2>
            <p className="framer-text-lg mb-8 max-w-2xl mx-auto framer-fade-in framer-delay-100">
              Join 127 businesses that trust ADINA to handle their customer calls 
              with professionalism and intelligence.
            </p>
            <div className="flex flex-wrap justify-center gap-8 framer-text-sm mb-12 framer-fade-in framer-delay-150">
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">🚀</span>
                <span>Featured in TechCrunch</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">🏆</span>
                <span>Best AI Solution 2024</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">⭐</span>
                <span>4.9/5 Customer Rating</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center framer-fade-in framer-delay-200">
              <a 
                href="https://calendly.com/contact-calladina/30min?preview_source=et_card&month=2025-06"
                target="_blank"
                rel="noopener noreferrer"
                className="framer-btn framer-btn-primary text-lg px-10 py-4 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Book Free Demo
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </a>
              <button 
                onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                className="framer-btn framer-btn-secondary text-lg px-10 py-4 hover:scale-105 transition-all duration-300"
              >
                View Pricing
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Transition 6 */}
      <div className="framer-divider bg-blue-100"></div>

      {/* Footer */}
      <footer className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="framer-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">A</span>
                </div>
                <span className="framer-heading-sm">ADINA</span>
              </div>
              <p className="framer-text-sm text-gray-600 mb-4">
                AI-powered phone reception that never sleeps, never takes a break.
              </p>
              <div className="flex space-x-4 framer-text-sm">
                <span>📞 (555) 123-ADINA</span>
                <span>📧 contact@calladina.com</span>
              </div>
            </div>
            
            <div>
              <h3 className="framer-text-sm font-bold mb-4">Contact & Support</h3>
              <div className="space-y-2 framer-text-sm text-gray-600">
                <div>Business Hours: 9 AM - 6 PM EST</div>
                <div>Support: Available 24/7</div>
                <div>Response Time: &lt; 2 hours</div>
                <div>Address: Toronto, ON, Canada</div>
              </div>
            </div>
            
            <div>
              <h3 className="framer-text-sm font-bold mb-4">Trust & Security</h3>
              <div className="space-y-2 framer-text-sm text-gray-600">
                <div>🔒 SOC 2 Type II Certified</div>
                <div>🌍 GDPR & CCPA Compliant</div>
                <div>⚡ 99.9% Uptime SLA</div>
                <div>🛡️ Enterprise-grade Security</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center framer-fade-in">
              <div className="framer-text-sm text-gray-600 mb-4 md:mb-0">
                © 2024 ADINA AI Inc. All rights reserved. Y Combinator W24.
              </div>
              <div className="flex space-x-6 framer-text-sm text-gray-600">
                <a href="#" className="hover:text-blue-600">Privacy Policy</a>
                <a href="#" className="hover:text-blue-600">Terms of Service</a>
                <a href="#" className="hover:text-blue-600">Security</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Fake Checkout Modal */}
      {showFakeCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="framer-card max-w-md w-full mx-4 p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-xl font-bold text-white">🔧</span>
              </div>
              <h3 className="framer-heading-sm mb-2">Dev Mode Checkout</h3>
              <p className="framer-text-md">
                Testing {selectedPlanForCheckout?.name} Plan - ${selectedPlanForCheckout?.price}/month
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block framer-text-sm font-medium mb-2">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456 (any numbers work)"
                  value={fakeCardNumber}
                  onChange={(e) => setFakeCardNumber(e.target.value)}
                  className="framer-input"
                  maxLength="19"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block framer-text-sm font-medium mb-2">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={fakeExpiry}
                    onChange={(e) => setFakeExpiry(e.target.value)}
                    className="framer-input"
                    maxLength="5"
                  />
                </div>
                <div>
                  <label className="block framer-text-sm font-medium mb-2">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={fakeCvv}
                    onChange={(e) => setFakeCvv(e.target.value)}
                    className="framer-input"
                    maxLength="4"
                  />
                </div>
              </div>

              <div>
                <label className="block framer-text-sm font-medium mb-2">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fakeName}
                  onChange={(e) => setFakeName(e.target.value)}
                  className="framer-input"
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={handleFakePayment}
                disabled={loading}
                className="framer-btn framer-btn-primary w-full py-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="framer-spinner mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>🔧 Process Fake Payment</>
                )}
              </button>

              <button
                onClick={() => setShowFakeCheckout(false)}
                disabled={loading}
                className="framer-btn framer-btn-ghost w-full py-3"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="framer-text-sm text-yellow-800">
                ⚠️ <strong>Dev Mode:</strong> This is a fake checkout for testing. Any card details will work.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;