# 🤖 AI Appointment Setter - Multi-Tenant System

A comprehensive AI-powered appointment booking system with multi-tenant architecture, supporting webchat, SMS, WhatsApp, voice calls, and social media DMs.

## 🚀 Live Demo

**Dashboard**: https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/

## 📱 Features

- **Multi-Tenant Architecture**: Complete data isolation per client
- **AI Appointment Booking**: Natural language processing for date/time extraction
- **Multi-Channel Support**: Webchat, SMS, WhatsApp, Voice, Facebook, Instagram
- **Real-time Dashboard**: Analytics, conversation history, appointment management
- **N8N Automation**: Voice call processing and workflow automation
- **Secure Authentication**: NextAuth.js with tenant-based access control

## 🏗️ Architecture

### Frontend (Next.js)
- **Dashboard**: Tenant management, analytics, settings
- **Webchat Widget**: Embeddable chat interface
- **Authentication**: NextAuth.js with Google OAuth

### Backend APIs
- **Webchat**: `/api/chat` - Real-time chat processing
- **SMS**: `/api/sms/webhook` - Twilio SMS integration
- **WhatsApp**: `/api/whatsapp/webhook` - Twilio WhatsApp integration
- **Facebook**: `/api/social/facebook/webhook` - Messenger integration
- **Instagram**: `/api/social/instagram/webhook` - DM integration
- **Voice Calls**: `/api/calls` - Call record management
- **Appointments**: `/api/appointments` - Calendar integration

### Database (Firestore)
- **Tenants**: Client configurations and AI settings
- **Messages**: All conversation history
- **Appointments**: Booked appointments
- **Calls**: Voice call records

### Automation (N8N)
- **Voice Processing**: Call analysis and appointment extraction
- **Multi-tenant Routing**: Phone number to tenant mapping
- **Workflow Automation**: End-to-end call handling

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- Firebase project with Firestore
- Vercel account
- Render account (for N8N)

### Environment Variables
```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret

# Twilio (SMS & WhatsApp)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token

# Facebook (Messenger & Instagram)
FACEBOOK_PAGE_ACCESS_TOKEN=your-page-token
FACEBOOK_VERIFY_TOKEN=your-verify-token
INSTAGRAM_PAGE_ACCESS_TOKEN=your-instagram-token
INSTAGRAM_VERIFY_TOKEN=your-instagram-verify-token

# N8N Encryption
N8N_ENCRYPTION_KEY=61C78B115DF53F2FBD9E36B27744908B0B0D9E7CBB83AB28B23CDCB9683AD268
```

### Deployment Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd dashboard
```

2. **Install Dependencies**
```bash
npm install
```

3. **Deploy to Vercel**
```bash
vercel --prod
```

4. **Configure N8N on Render**
- Deploy N8N workflow to Render
- Set up cron job for free tier (pings every 5 minutes)
- Configure webhook URLs pointing to your Vercel deployment

## 📞 Channel Integrations

### Webchat Widget
- **Embed Code**: Add iframe to any website
- **URL**: `/embed/chat`
- **Features**: Real-time chat, appointment booking, multi-tenant isolation

### SMS (Twilio)
- **Webhook**: `/api/sms/webhook`
- **Setup**: Configure Twilio webhook URL
- **Features**: Two-way SMS, AI responses, appointment booking

### WhatsApp (Twilio)
- **Webhook**: `/api/whatsapp/webhook`
- **Setup**: Configure Twilio WhatsApp webhook
- **Features**: Two-way messaging, AI responses, appointment booking

### Voice Calls (N8N + Vapi)
- **Processing**: N8N workflow handles call analysis
- **Storage**: `/api/calls` endpoint saves call records
- **Features**: Call transcription, appointment extraction, handoff to human

### Social Media
- **Facebook Messenger**: `/api/social/facebook/webhook`
- **Instagram DMs**: `/api/social/instagram/webhook`
- **Setup**: Configure webhook URLs in Facebook Developer Console

## 🔧 N8N Workflow Setup

### Required Nodes
1. **Trigger**: Webhook for incoming calls
2. **Lookup Tenant**: `/api/tenants/lookup` (phone number → tenant ID)
3. **Call Analysis**: AI processing of call transcript
4. **Save Call Record**: `/api/calls` (store call data)
5. **Create Appointment**: `/api/appointments` (if appointment found)
6. **Send Response**: Notify customer of booking

### Webhook URLs for N8N
```
Tenant Lookup: https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/api/tenants/lookup
Save Call: https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/api/calls
Create Appointment: https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/api/appointments
```

### Render Deployment Recovery
If N8N crashes due to inactivity on Render free tier:
1. Go to `https://dashboard.render.com/`
2. Find your N8N service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Restart cron job service to keep it awake
5. Test with a call to verify functionality

## 🧪 Testing

### Webchat Testing
1. Visit dashboard URL
2. Click blue chat widget
3. Test appointment booking: "Book me for tomorrow at 2pm, email: test@example.com"

### API Testing
```bash
# Test webchat
curl -X POST https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"tenant_1759865651547_4ne6y2dtr","message":"Book appointment","channel":"webchat"}'

# Test SMS webhook
curl -X POST https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/api/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&To=%2B0987654321&Body=Test message"

# Test call record creation
curl -X POST https://dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app/api/calls \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"tenant_1759865651547_4ne6y2dtr","callId":"test123","from":"+1234567890","status":"completed"}'
```

## 🔐 Multi-Tenant Security

- **Data Isolation**: Each tenant has separate Firestore collections
- **Authentication**: NextAuth.js with tenant-based session management
- **API Security**: All endpoints validate tenant ownership
- **Access Control**: Users can only access their own tenant data

## 📊 Dashboard Features

### Analytics
- Conversation volume per channel
- Appointment booking success rates
- Response time metrics
- Customer engagement stats

### Management
- Tenant configuration
- AI assistant settings
- Channel integrations
- User management

### Real-time Monitoring
- Live conversation feeds
- Appointment notifications
- System health status
- Error logging

## 🚨 Troubleshooting

### Common Issues
1. **N8N Timeout**: Redeploy on Render (see recovery steps above)
2. **Webhook 500 Errors**: Check environment variables
3. **Authentication Issues**: Verify NextAuth configuration
4. **Firestore Errors**: Check Firebase credentials and indexes

### Support
- Check Vercel logs: `vercel logs dashboard-n0rixxt2f-masons-projects-35ff3531.vercel.app`
- Monitor Firestore console for data issues
- Review N8N workflow execution logs

## 📈 Production Readiness

### Performance
- Serverless architecture scales automatically
- Firestore handles high-volume data
- N8N workflows process calls efficiently
- CDN delivery for global performance

### Reliability
- Multi-region deployment via Vercel
- Automated backups via Firestore
- Graceful error handling
- Health monitoring endpoints

### Security
- HTTPS encryption
- API rate limiting
- Input validation
- Secure environment variables

## 🎯 Success Metrics

- **Uptime**: 99.9% availability
- **Response Time**: <2 seconds for chat responses
- **Appointment Success Rate**: >90% booking completion
- **Multi-tenant Isolation**: 100% data separation

---

**Built with ❤️ using Next.js, Firebase, N8N, and modern web technologies.**
