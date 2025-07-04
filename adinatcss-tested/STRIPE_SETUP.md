# Stripe Integration Setup Guide

## Overview
This guide will help you set up Stripe payments for your ADINA AI Voice Receptionist platform with minute-based billing.

## 🎯 What You'll Need

1. **Stripe Account** - [Sign up at stripe.com](https://stripe.com)
2. **Stripe CLI** (optional but recommended for webhooks)
3. **Environment variables configured**

## 📋 Step-by-Step Setup

### 1. Create Stripe Account & Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy your **Publishable key** and **Secret key**
4. Add them to your `.env` file:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Create Products and Pricing

#### Create Products in Stripe Dashboard:

1. Go to **Products → Create product**
2. Create three products:

**Starter Plan:**
- Name: "ADINA Starter Plan"
- Description: "300 AI-handled minutes/month"
- Pricing: $89/month recurring

**Professional Plan:**
- Name: "ADINA Professional Plan" 
- Description: "900 AI-handled minutes/month"
- Pricing: $179/month recurring

**Enterprise Plan:**
- Name: "ADINA Enterprise Plan"
- Description: "2,400 AI-handled minutes/month"  
- Pricing: $349/month recurring

#### Get Price IDs:

After creating each product, copy the Price ID (starts with `price_`) and add to `.env`:

```env
REACT_APP_STRIPE_STARTER_PRICE_ID=price_1234567890abcdefghijklmn
REACT_APP_STRIPE_PROFESSIONAL_PRICE_ID=price_abcdefghijklmnopqrstuvwx
REACT_APP_STRIPE_ENTERPRISE_PRICE_ID=price_zyxwvutsrqponmlkjihgfedc
```

### 3. Set Up Webhooks

#### Option A: Using Stripe CLI (Recommended for Development)

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
# Download from https://github.com/stripe/stripe-cli/releases
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

4. Copy the webhook signing secret and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Option B: Manual Webhook Setup

1. Go to **Developers → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/stripe-webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4. Configure Customer Portal

1. Go to **Settings → Customer Portal**
2. Enable the customer portal
3. Configure allowed actions:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscription
   - ✅ Update billing information

### 5. Test the Integration

#### Test Cards for Development:

```
# Successful payment
4242 4242 4242 4242

# Declined payment
4000 0000 0000 0002

# Requires authentication
4000 0025 0000 3155
```

## 🚀 How It Works

### Payment Flow:

1. **User selects plan** → Redirects to Stripe Checkout
2. **Payment successful** → Webhook triggers plan activation
3. **User returns** → Dashboard shows active subscription
4. **Usage tracking** → Minutes are tracked and billed

### Minute-Based Billing:

- **Included Minutes**: Each plan includes a monthly allowance
- **Overage Billing**: Additional minutes charged at plan rate
- **Real-time Tracking**: Usage updated after each call
- **Monthly Reset**: Minutes reset at billing cycle

### Subscription Management:

- **Customer Portal**: Users can update payment, view invoices, cancel
- **Automatic Billing**: Monthly charges with overage calculations
- **Webhook Handling**: Real-time subscription status updates

## 🔧 Key Features Implemented

### Frontend (`stripeService.js`):
- ✅ Checkout session creation
- ✅ Billing portal access
- ✅ Subscription status checking
- ✅ Usage reporting

### Backend (Server routes):
- ✅ `/api/create-checkout-session` - Create payment session
- ✅ `/api/create-billing-portal-session` - Customer portal
- ✅ `/api/subscription-status/:userId` - Check subscription
- ✅ `/api/report-usage` - Track minute usage
- ✅ `/api/stripe-webhook` - Handle Stripe events

### Database Integration:
- ✅ Plan data stored in Firebase
- ✅ Usage tracking with overages
- ✅ Subscription status sync
- ✅ Billing history

## 🛠 Troubleshooting

### Common Issues:

**"No customer found" error:**
- Ensure user email matches between Firebase and Stripe
- Check webhook is properly configured

**Webhook signature verification failed:**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint is accessible

**Price ID not found:**
- Double-check price IDs in Stripe Dashboard
- Ensure environment variables are set correctly

### Debug Endpoints:

```bash
# Check subscription status
GET /api/subscription-status/:userId

# Test webhook locally
stripe trigger checkout.session.completed
```

## 📈 Production Deployment

### Before Going Live:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update API keys** to live keys
3. **Configure production webhooks**
4. **Test with real payment methods**
5. **Set up monitoring** for failed payments

### Security Checklist:

- ✅ Never expose secret keys in frontend
- ✅ Validate webhook signatures
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Log payment events for auditing

## 💡 Advanced Features

### Future Enhancements:

- **Usage-based billing** with metered pricing
- **Annual subscription discounts**
- **Team/multi-user plans**
- **Custom enterprise pricing**
- **Proration for plan changes**

### Analytics Integration:

- Track conversion rates
- Monitor churn and retention
- Revenue analytics
- Usage pattern analysis

---

## 🎉 You're All Set!

Your ADINA platform now has:
- ✅ Secure Stripe payment processing
- ✅ Minute-based subscription billing
- ✅ Automatic usage tracking
- ✅ Customer self-service portal
- ✅ Real-time subscription management

Start testing with the test cards above, then switch to live mode when ready to accept real payments! 