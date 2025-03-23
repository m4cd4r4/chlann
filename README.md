# ChlannClaude - High-Resolution Media Sharing Messenger

A media-messaging app focusing on high-resolution media sharing, along with text and links, designed for a small group of users (~20) with self-hosting capabilities.

## Features

- **High-resolution photo sharing**: Maintain image quality while providing optimized versions
- **High-resolution video sharing**: Support for high-quality videos with adaptive streaming
- **Text and link sharing**: Rich messaging capabilities
- **AI-powered search functionality**:
  - Search by poster
  - Search by people in photos
  - Search by date range/calendar
- **Real-time messaging**: Instant message delivery and typing indicators
- **Optimized for self-hosting on a VPS**: Runs efficiently on modest hardware

## System Architecture

The application follows a microservices architecture for flexibility and scalability:

- **Frontend**: 
  - React Native mobile application with Redux for state management
  - Support for both iOS and Android platforms

- **Backend Services**:
  - **Authentication Service**: Handle user registration, login, and session management
  - **Messaging Service**: Manage text messages and link sharing
  - **Media Service**: Handle upload, processing, and delivery of photos and videos
  - **Search Service**: Provide advanced search capabilities across all content
  - **API Gateway**: Route requests to appropriate services

- **Data Storage**:
  - MongoDB for user data, messages, and metadata
  - S3-compatible storage (MinIO) for media files
  - Redis for caching and real-time features

## Key Technical Features

### High-Resolution Media

- **Images**: Multiple resolution variants to balance quality and performance
  - Original (preserved for archival)
  - Large (optimized for fullscreen viewing)
  - Medium (optimized for chat)
  - Small (optimized for thumbnails)
  
- **Videos**: Adaptive quality with efficient processing
  - Server-side transcoding to optimize for different devices
  - Thumbnail generation for previews
  - Efficient delivery with chunked streaming

### Search Functionality

- **Full-text search** across messages and media metadata
- **Face recognition** capability for finding people in photos
- **Temporal search** for finding content by date ranges
- **Semantic search** for finding similar content

### Real-time Communication

- WebSocket-based messaging using Socket.IO
- Typing indicators, read receipts, and presence detection
- Offline message queueing

## Development Setup

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- MongoDB
- Redis
- S3-compatible storage (MinIO for local development)

### Getting Started

1. Clone the repository
   ```
   git clone https://github.com/yourusername/chlannClaude.git
   cd chlannClaude
   ```

2. Start the development environment
   ```
   docker-compose -f docker/docker-compose.dev.yml up
   ```

3. Install backend dependencies
   ```
   cd backend
   npm install
   ```

4. Install mobile app dependencies
   ```
   cd mobile
   npm install
   ```

5. Start the backend services
   ```
   cd backend
   npm run dev
   ```

6. Start the mobile app
   ```
   cd mobile
   npm start
   ```

## Deployment

For production deployment on a VPS:

1. Set up a VPS with Docker and Docker Compose
2. Clone the repository
3. Configure environment variables in `.env.production`
4. Run `docker-compose -f docker/docker-compose.prod.yml up -d`

## Project Structure

```
chlannClaude/
├── backend/
│   ├── api-gateway/       # API gateway service
│   ├── auth-service/      # Authentication service
│   ├── messaging-service/ # Message handling service
│   ├── media-service/     # Media processing service
│   └── search-service/    # Search functionality service
├── mobile/                # React Native mobile app
│   ├── src/
│   │   ├── assets/        # Images, fonts, etc.
│   │   ├── components/    # Reusable UI components
│   │   ├── config/        # Configuration files
│   │   ├── navigation/    # Navigation setup
│   │   ├── redux/         # Redux state management
│   │   ├── screens/       # App screens
│   │   ├── services/      # API and service functions
│   │   └── utils/         # Utility functions
├── docker/                # Docker configuration files
└── docs/                  # Documentation
```

## License

[MIT License](LICENSE)
