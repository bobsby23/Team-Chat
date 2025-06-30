# Bobsby Chat - Real-time Secure Messaging

A simple, secure, real-time chat application with no registration required.

## Features

✅ **Real-time Updates** - Server-Sent Events for instant message delivery
✅ **Message Reactions** - React to messages with emojis
✅ **Typing Indicators** - See when others are typing
✅ **24-hour Auto-delete** - Messages automatically expire for privacy
✅ **PWA Support** - Install as a mobile app
✅ **No Registration** - Just enter your name and start chatting

## Quick Start

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd bobsby-chat
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open in browser**
   \`\`\`
   http://localhost:3000
   \`\`\`

## Deployment to Vercel

### Option 1: Deploy from GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect Next.js and deploy

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI**
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. **Login to Vercel**
   \`\`\`bash
   vercel login
   \`\`\`

3. **Deploy**
   \`\`\`bash
   vercel --prod
   \`\`\`

## Architecture

- **Frontend**: Next.js 15 with React 18
- **Real-time**: Server-Sent Events (SSE)
- **Storage**: In-memory (for demo) - use Redis/Database for production
- **Styling**: Tailwind CSS + shadcn/ui
- **PWA**: Service Worker + Web App Manifest

## API Endpoints

- `GET /api/messages` - Fetch messages
- `POST /api/messages` - Send message/reaction/typing
- `GET /api/sse` - Real-time event stream

## Environment Variables

No environment variables required for basic deployment.

## Production Considerations

For production use, consider:

- Replace in-memory storage with Redis or database
- Add rate limiting
- Implement proper user authentication
- Add message moderation
- Scale with multiple server instances

## License

MIT License
