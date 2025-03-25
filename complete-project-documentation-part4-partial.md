_id: 'user456',
        username: 'newuser',
        email: 'newuser@example.com',
        devices: [],
        save: jest.fn().mockResolvedValue(true)
      };
      
      bcrypt.hash.mockResolvedValue('hashedpassword');
      User.findOne.mockResolvedValue(null); // No existing user
      User.prototype.save = jest.fn().mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('fake-jwt-token');
      
      // Act
      await authController.register(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', expect.any(Number));
      expect(User.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.any(Object),
        accessToken: 'fake-jwt-token',
        refreshToken: expect.any(String)
      }));
    });
    
    it('should return error for existing username', async () => {
      // Arrange
      req.body = {
        username: 'existinguser',
        email: 'newuser@example.com',
        password: 'password123',
        deviceId: 'device123'
      };
      
      User.findOne.mockResolvedValueOnce({ username: 'existinguser' }); // Username exists
      
      // Act
      await authController.register(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Username already taken'
      }));
    });
  });
});
```

## 13.2 Integration Testing

Integration tests validate the interaction between components:

1. **API Integration Test**
```javascript
// messagesApi.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Message = require('../../models/Message');
const User = require('../../models/User');
const Conversation = require('../../models/Conversation');
const jwt = require('jsonwebtoken');
const config = require('../../config');

describe('Messages API', () => {
  let token;
  let userId;
  let conversationId;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Create test user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      devices: [{ deviceId: 'testdevice', name: 'Test Device', platform: 'test' }]
    });
    
    userId = user._id;
    
    // Create test conversation
    const conversation = await Conversation.create({
      name: 'Test Conversation',
      participantIds: [userId],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    conversationId = conversation._id;
    
    // Generate token for authentication
    token = jwt.sign({ userId, deviceId: 'testdevice' }, config.jwt.secret);
  });
  
  afterAll(async () => {
    // Clean up test database
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    
    // Disconnect from test database
    await mongoose.disconnect();
  });
  
  beforeEach(async () => {
    // Clear messages before each test
    await Message.deleteMany({});
  });
  
  describe('GET /api/conversations/:id/messages', () => {
    it('should retrieve messages for a conversation', async () => {
      // Create some test messages
      await Message.create([
        {
          conversationId,
          senderId: userId,
          content: 'Test message 1',
          type: 'text',
          createdAt: new Date()
        },
        {
          conversationId,
          senderId: userId,
          content: 'Test message 2',
          type: 'text',
          createdAt: new Date()
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body[0].content).toBe('Test message 1');
    });
    
    it('should return 404 for non-existent conversation', async () => {
      const fakeId = mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .get(`/api/conversations/${fakeId}/messages`)
        .set('Authorization', `Bearer ${token}`);
      
      // Assertions
      expect(response.status).toBe(404);
    });
    
    it('should return 401 without authentication', async () => {
      // Make API request without token
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`);
      
      // Assertions
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/messages', () => {
    it('should create a new message', async () => {
      // Prepare message data
      const messageData = {
        conversationId,
        content: 'New test message',
        type: 'text'
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData);
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.content).toBe('New test message');
      expect(response.body.senderId).toBe(userId.toString());
      
      // Verify message was saved to database
      const message = await Message.findById(response.body._id);
      expect(message).toBeTruthy();
      expect(message.content).toBe('New test message');
    });
    
    it('should return 400 with invalid data', async () => {
      // Missing required fields
      const messageData = {
        content: 'New test message'
        // Missing conversationId
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData);
      
      // Assertions
      expect(response.status).toBe(400);
    });
  });
});
```

2. **Socket.io Integration Test**
```javascript
// socketIntegration.test.js
const http = require('http');
const io = require('socket.io-client');
const { createServer } = require('../../socket');
const Message = require('../../models/Message');
const User = require('../../models/User');
const Conversation = require('../../models/Conversation');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../../config');

describe('Socket.io Integration', () => {
  let httpServer;
  let socket;
  let token;
  let userId;
  let conversationId;
  let socketUrl;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Create test user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      devices: [{ deviceId: 'testdevice', name: 'Test Device', platform: 'test' }]
    });
    
    userId = user._id;
    
    // Create test conversation
    const conversation = await Conversation.create({
      name: 'Test Conversation',
      participantIds: [userId],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    conversationId = conversation._id;
    
    // Generate token for authentication
    token = jwt.sign({ userId, deviceId: 'testdevice' }, config.jwt.secret);
    
    // Create HTTP server
    httpServer = http.createServer();
    
    // Attach Socket.io
    createServer(httpServer);
    
    // Start server
    await new Promise(resolve => {
      httpServer.listen(0, () => {
        const port = httpServer.address().port;
        socketUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });
  
  afterAll(async () => {
    // Clean up test database
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    
    // Close server and connections
    await new Promise(resolve => {
      httpServer.close(resolve);
    });
    
    // Disconnect from database
    await mongoose.disconnect();
  });
  
  beforeEach(async () => {
    // Clear messages before each test
    await Message.deleteMany({});
    
    // Connect socket
    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });
    
    // Wait for connection
    await new Promise(resolve => {
      socket.on('connect', resolve);
    });
  });
  
  afterEach(() => {
    // Disconnect socket
    if (socket.connected) {
      socket.disconnect();
    }
  });
  
  describe('Real-time messaging', () => {
    it('should send and receive messages', done => {
      // Message data
      const messageData = {
        conversationId: conversationId.toString(),
        content: 'Socket test message',
        type: 'text',
        clientId: 'test-client-id'
      };
      
      // Listen for message confirmation
      socket.on('message:sent', response => {
        expect(response.clientId).toBe(messageData.clientId);
        expect(response.messageId).toBeTruthy();
        done();
      });
      
      // Send message
      socket.emit('message:send', messageData);
    });
    
    it('should notify about typing status', done => {
      // Listen for typing update
      socket.on('typing:update', data => {
        expect(data.userId).toBe(userId.toString());
        expect(data.conversationId).toBe(conversationId.toString());
        expect(data.status).toBe('typing');
        done();
      });
      
      // Join conversation room
      socket.emit('join:conversation', { conversationId: conversationId.toString() });
      
      // Emit typing start
      socket.emit('typing:start', { conversationId: conversationId.toString() });
    });
  });
});
```

## 13.3 Performance Testing

Performance tests evaluate the system's responsiveness and scalability:

1. **Load Testing Script (k6)**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const messagesSent = new Counter('messages_sent');
const messagesReceived = new Counter('messages_received');
const messageLatency = new Trend('message_latency');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users over 1 minute
    { duration: '3m', target: 10 }, // Stay at 10 users for 3 minutes
    { duration: '1m', target: 20 }, // Ramp up to 20 users over 1 minute
    { duration: '3m', target: 20 }, // Stay at 20 users for 3 minutes
    { duration: '1m', target: 0 }   // Ramp down to 0 users over 1 minute
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    'error_rate': ['rate<0.1'],       // Error rate should be less than 10%
    'message_latency': ['p(95)<300']  // 95% of message delivery should be below 300ms
  },
};

// Test setup
const BASE_URL = 'https://example.com/api';
let token;
let conversationId;

// Helper to generate random data
function generateRandomText() {
  return `Test message ${Math.random().toString(36).substring(2, 15)}`;
}

// Setup function - runs once per VU
export function setup() {
  // Log in to get token
  const loginPayload = JSON.stringify({
    email: `testuser${__VU}@example.com`,
    password: 'password123',
    deviceId: `device-${__VU}`
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const loginResponse = http.post(`${BASE_URL}/auth/login`, loginPayload, loginParams);
  
  check(loginResponse, {
    'Login successful': (r) => r.status === 200,
    'Got token': (r) => r.json('accessToken') !== undefined,
  });
  
  if (loginResponse.status !== 200) {
    errorRate.add(1);
    throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.body}`);
  }
  
  const authData = loginResponse.json();
  token = authData.accessToken;
  
  // Get or create a conversation for testing
  const conversationsResponse = http.get(`${BASE_URL}/conversations`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (
    conversationsResponse.status === 200 && 
    conversationsResponse.json().length > 0
  ) {
    // Use existing conversation
    conversationId = conversationsResponse.json()[0]._id;
  } else {
    // Create new conversation
    const createConvPayload = JSON.stringify({
      name: `Test Conversation ${__VU}`,
      participantIds: [authData.user._id]
    });
    
    const createConvResponse = http.post(
      `${BASE_URL}/conversations`,
      createConvPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    check(createConvResponse, {
      'Create conversation successful': (r) => r.status === 201,
    });
    
    if (createConvResponse.status !== 201) {
      errorRate.add(1);
      throw new Error(`Create conversation failed: ${createConvResponse.status}`);
    }
    
    conversationId = createConvResponse.json()._id;
  }
  
  return { token, conversationId };
}

// Default function - main test case
export default function(data) {
  const { token, conversationId } = data;
  
  // Send a message
  const clientId = `${__VU}-${Date.now()}`;
  const messagePayload = JSON.stringify({
    conversationId,
    content: generateRandomText(),
    type: 'text',
    clientId
  });
  
  const startTime = Date.now();
  
  const messageResponse = http.post(
    `${BASE_URL}/messages`,
    messagePayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const endTime = Date.now();
  const latency = endTime - startTime;
  
  check(messageResponse, {
    'Send message successful': (r) => r.status === 201,
  });
  
  if (messageResponse.status === 201) {
    messagesSent.add(1);
    messageLatency.add(latency);
  } else {
    errorRate.add(1);
  }
  
  // Get messages
  const messagesResponse = http.get(
    `${BASE_URL}/conversations/${conversationId}/messages`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  check(messagesResponse, {
    'Get messages successful': (r) => r.status === 200,
    'Messages returned': (r) => r.json().length > 0,
  });
  
  if (messagesResponse.status === 200) {
    messagesReceived.add(1);
  } else {
    errorRate.add(1);
  }
  
  // Random pause between operations
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}
```

2. **API Response Time Test**
```javascript
// api-performance.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const jwt = require('jsonwebtoken');
const config = require('../../config');

describe('API Performance Tests', () => {
  let token;
  let userId;
  let conversationId;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Create test user
    const user = await User.create({
      username: 'perftest',
      email: 'perf@example.com',
      passwordHash: 'hashedpassword',
      devices: [{ deviceId: 'perfdevice', name: 'Perf Device', platform: 'test' }]
    });
    
    userId = user._id;
    
    // Generate token
    token = jwt.sign({ userId, deviceId: 'perfdevice' }, config.jwt.secret);
    
    // Create test conversation
    const conversation = await Conversation.create({
      name: 'Performance Test',
      participantIds: [userId],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    conversationId = conversation._id;
    
    // Create test messages (100 messages)
    const messages = [];
    for (let i = 0; i < 100; i++) {
      messages.push({
        conversationId,
        senderId: userId,
        content: `Message ${i}`,
        type: 'text',
        createdAt: new Date(Date.now() - (100 - i) * 60000) // 1 minute apart
      });
    }
    
    await Message.insertMany(messages);
  });
  
  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    
    // Disconnect
    await mongoose.disconnect();
  });
  
  describe('GET /api/conversations', () => {
    it('should retrieve conversations list quickly', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200); // Response should be under 200ms
    });
  });
  
  describe('GET /api/conversations/:id/messages', () => {
    it('should retrieve messages with pagination efficiently', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=20`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(response.body.length).toBe(20); // Should return exactly 20 messages
      expect(duration).toBeLessThan(200); // Response should be under 200ms
    });
  });
  
  describe('GET /api/search', () => {
    it('should perform text search efficiently', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/search?query=Message&type=messages')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500); // Search should be under 500ms
    });
  });
  
  describe('POST /api/messages', () => {
    it('should create new messages quickly', async () => {
      const messageData = {
        conversationId,
        content: 'Performance test message',
        type: 'text'
      };
      
      const start = Date.now();
      
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData)
        .expect(201);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200); // Message creation should be under 200ms
    });
  });
});
```

## 13.4 User Acceptance Testing

A structured approach to user acceptance testing:

1. **Test Plan**
```
# User Acceptance Testing Plan

## Test Objectives
- Verify that the application meets all functional requirements
- Validate user experience and usability
- Ensure performance meets user expectations
- Identify any issues or bugs from a user perspective

## Test Environment
- Test devices: iPhone 13, Samsung Galaxy S21, Google Pixel 6
- Test OS versions: iOS 15+, Android 11+
- Network conditions: WiFi, 4G, 3G (simulated)
- Test users: 5 selected users from the target audience

## Test Scenarios

### 1. User Registration and Authentication
- Register new account
- Login with existing account
- Logout
- Password reset
- Multi-device login

### 2. Conversation Management
- Create new conversation
- Add users to conversation
- Remove users from conversation
- View conversation list
- View conversation details

### 3. Messaging
- Send text message
- Receive text message in real-time
- Send link
- View link preview
- View message status (sent, delivered, read)

### 4. Media Handling
- Take photo and share directly
- Select photo from gallery and share
- Record video and share directly
- Select video from gallery and share
- View shared photo (normal quality)
- View shared photo (high quality)
- View shared video (normal quality)
- View shared video (high quality)
- Download media

### 5. Search Functionality
- Search for message text
- Search for media by content
- Search by date
- Search for specific person
- Filter search results

### 6. Performance Testing
- App responsiveness during media upload
- Media viewing load time
- Message sending/receiving latency
- Search response time
- App memory usage

### 7. Usability Testing
- Navigation flow
- Interface clarity
- Error messages
- Feature discoverability
- Accessibility

## Test Metrics
- Test case pass/fail rate
- Issue severity classification
- User satisfaction rating (1-5)
- Performance benchmarks
  - Media upload time
  - Image loading time
  - Video playback start time
  - Message delivery time

## Test Schedule
- Preparation: 1 week
- Testing period: 2 weeks
- Analysis and reporting: 1 week
```

2. **Test Cases Example**
```
# UAT Test Cases: High-Resolution Media Sharing

## TC-001: Share High-Resolution Image

### Preconditions:
- User is logged in
- User has joined a conversation
- User has a high-resolution image (>5MP) in gallery

### Steps:
1. Open conversation
2. Tap attachment button
3. Select "Gallery"
4. Choose high-resolution image
5. Tap "Send" with "Original Quality" option

### Expected Results:
- Upload progress indicator is shown
- Message with image thumbnail appears in conversation
- Image status shows "Sent" when upload completes
- Recipient can view image in full resolution by tapping it
- EXIF data is preserved when viewing image details

### Pass/Fail Criteria:
- Image maintains original resolution
- Image loads progressively (thumbnail first, then full quality)
- Image upload completes within 30 seconds on 4G connection

---

## TC-002: View High-Resolution Image

### Preconditions:
- User is logged in
- Conversation contains a shared high-resolution image

### Steps:
1. Open conversation
2. Tap on shared image thumbnail
3. Wait for full image to load
4. Pinch to zoom in on specific area
5. Check image quality while zoomed

### Expected Results:
- Image initially loads in preview quality
- Full resolution loads progressively
- Zooming shows clear detail without pixelation
- Image quality indicator shows current resolution
- Tapping quality indicator toggles between resolutions

### Pass/Fail Criteria:
- Full resolution image shows significantly more detail than preview
- Zooming maintains clarity (text in image should be readable)
- Switching between quality levels is smooth
- Full image loads within 5 seconds on WiFi

---

## TC-003: Share Video in High Quality

### Preconditions:
- User is logged in
- User has joined a conversation
- User has a HD video (1080p) in gallery

### Steps:
1. Open conversation
2. Tap attachment button
3. Select "Gallery"
4. Choose HD video
5. Select "High Quality" option
6. Tap "Send"

### Expected Results:
- Upload progress indicator is shown
- Message with video thumbnail appears in conversation
- Video status shows "Processing" during conversion
- Video status changes to "Sent" when processing completes
- Recipient receives notification of new video

### Pass/Fail Criteria:
- Video maintains high quality when played
- Video has preview thumbnail
- Processing and upload completes within 2 minutes on WiFi

---

## TC-004: Search for Media By Content

### Preconditions:
- User is logged in
- User has shared and received various images

### Steps:
1. Tap on Search tab
2. Enter search term related to image content (e.g., "beach")
3. Select "Media" filter
4. Review search results

### Expected Results:
- Search results show media matching the search term
- Results include images that contain the searched content
- Each result shows a thumbnail and metadata
- Tapping result opens the media

### Pass/Fail Criteria:
- AI-based search correctly identifies content in images
- Results appear within 3 seconds
- Results are categorized by relevance
```

---

# 14. Monitoring and Maintenance

## 14.1 Monitoring Setup

The application includes comprehensive monitoring:

1. **Prometheus Configuration**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'api-server'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

2. **Alert Rules**
```yaml
# alert_rules.yml
groups:
  - name: messaging_app_alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 85% for 5 minutes on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85% for 5 minutes on {{ $labels.instance }}"

      - alert: HighDiskUsage
        expr: 100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"}) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage detected"
          description: "Disk usage is above 85% for 10 minutes on {{ $labels.instance }}"

      - alert: APIHighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "95th percentile of API response time is above 500ms for 5 minutes for {{ $labels.handler }}"

      - alert: MediaProcessingDelay
        expr: media_processing_queue_size > 20
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Media processing queue building up"
          description: "Media processing queue has more than 20 items for 10 minutes"
```

3. **Grafana Dashboard Configuration**
```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "dataLinks": []
      },
      "percentage": false,
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "legendFormat": "CPU Usage ({{instance}})",
          "refId": "A"
        }
      ],
      "thresholds": [
        {
          "colorMode": "critical",
          "fill": true,
          "line": true,
          "op": "gt",
          "value": 85,
          "yaxis": "left"
        }
      ],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "CPU Usage",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "percent",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 3,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "dataLinks": []
      },
      "percentage": false,
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
          "legendFormat": "Memory Usage ({{instance}})",
          "refId": "A"
        }
      ],
      "thresholds": [
        {
          "colorMode": "critical",
          "fill": true,
          "line": true,
          "op": "gt",
          "value": 85,
          "yaxis": "left"
        }
      ],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "Memory Usage",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "percent",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 8
      },
      "hiddenSeries": false,
      "id": 4,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "dataLinks": []
      },
      "percentage": false,
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler))",
          "legendFormat": "{{handler}}",
          "refId": "A"
        }
      ],
      "thresholds": [
        {
          "colorMode": "critical",
          "fill": true,
          "line": true,
          "op": "gt",
          "value": 0.5,
          "yaxis": "left"
        }
      ],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "API Response Times (95th Percentile)",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "s",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 8
      },
      "hiddenSeries": false,
      "id": 5,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "dataLinks": []
      },
      "percentage": false,
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "media_processing_queue_size",
          "legendFormat": "Queue Size",
          "refId": "A"
        },
        {
          "expr": "rate(media_processing_completed_total[5m])",
          "legendFormat": "Processing Rate",
          "refId": "B"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "Media Processing Queue",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "10s",
  "schemaVersion": 22,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {
    "refresh_intervals": [
      "5s",
      "10s",
      "30s",
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "2h",
      "1d"
    ]
  },
  "timezone": "",
  "title": "Messaging App Dashboard",
  "uid": "messaging-app",
  "version": 1
}
```

## 14.2 Backup Strategy

A comprehensive backup strategy ensures data safety:

1. **Backup Script**
```bash
#!/bin/bash
# backup.sh

# Configuration
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="/opt/messaging-app/backups"
RETENTION_DAYS=30
LOG_FILE="/var/log/messaging-app-backup.log"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR/mongo
mkdir -p $BACKUP_DIR/minio
mkdir -p $BACKUP_DIR/redis
mkdir -p $BACKUP_DIR/logs

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup process..."

# MongoDB backup
log "Backing up MongoDB..."
docker exec messaging-mongo mongodump --archive=/tmp/mongodb-backup.gz --gzip
docker cp messaging-mongo:/tmp/mongodb-backup.gz $BACKUP_DIR/mongo/mongodb-$TIMESTAMP.gz

# MinIO backup
log "Backing up MinIO data..."
# Using rclone for MinIO backup
rclone sync minio:media $BACKUP_DIR/minio/$TIMESTAMP/

# Redis backup
log "Backing up Redis..."
docker exec messaging-redis redis-cli SAVE
docker cp messaging-redis:/data/dump.rdb $BACKUP_DIR/redis/redis-$TIMESTAMP.rdb

# Logs backup
log "Backing up logs..."
cp -r /opt/messaging-app/logs/* $BACKUP_DIR/logs/$TIMESTAMP/

# Clean up old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR/mongo -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/minio -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
find $BACKUP_DIR/redis -name "*.rdb" -type f -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/logs -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

log "Backup completed successfully!"
```

2. **Backup Schedule**
```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * /opt/messaging-app/scripts/backup.sh

# Add weekly offsite backup
0 3 * * 0 /opt/messaging-app/scripts/offsite-backup.sh
```

3. **Backup Verification**
```bash
#!/bin/bash
# verify-backup.sh

# Configuration
BACKUP_DIR="/opt/messaging-app/backups"
LOG_FILE="/var/log/messaging-app-backup-verify.log"
RESULT=0

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup verification..."

# Get latest MongoDB backup
LATEST_MONGO=$(ls -t $BACKUP_DIR/mongo/mongodb-*.gz | head -1)

if [ -z "$LATEST_MONGO" ]; then
  log "ERROR: No MongoDB backup found!"
  RESULT=1
else
  log "Verifying MongoDB backup: $LATEST_MONGO"
  # Check if file is valid gzip archive
  gzip -t $LATEST_MONGO
  if [ $? -ne 0 ]; then
    log "ERROR: MongoDB backup is corrupted!"
    RESULT=1
  else
    log "MongoDB backup verification passed."
  fi
fi

# Check MinIO backup
LATEST_MINIO=$(ls -td $BACKUP_DIR/minio/*/ 2>/dev/null | head -1)

if [ -z "$LATEST_MINIO" ]; then
  log "ERROR: No MinIO backup found!"
  RESULT=1
else
  log "Verifying MinIO backup: $LATEST_MINIO"
  # Check if directory has files
  FILE_COUNT=$(find $LATEST_MINIO -type f | wc -l)
  if [ $FILE_COUNT -eq 0 ]; then
    log "ERROR: MinIO backup is empty!"
    RESULT=1
  else
    log "MinIO backup verification passed ($FILE_COUNT files)."
  fi
fi

# Check Redis backup
LATEST_REDIS=$(ls -t $BACKUP_DIR/redis/redis-*.rdb | head -1)

if [ -z "$LATEST_REDIS" ]; then
  log "ERROR: No Redis backup found!"
  RESULT=1
else
  log "Verifying Redis backup: $LATEST_REDIS"
  # Check file size
  REDIS_SIZE=$(stat -c%s "$LATEST_REDIS")
  if [ $REDIS_SIZE -lt 1024 ]; then
    log "ERROR: Redis backup is suspiciously small!"
    RESULT=1
  else
    log "Redis backup verification passed."
  fi
fi

# Final result
if [ $RESULT -eq 0 ]; then
  log "All backup verifications passed!"
else
  log "Some backup verifications failed! Check the log for details."
fi

exit $RESULT
```

## 14.3 Update Process

A structured process for applying updates:

1. **Update Script**
```bash
#!/bin/bash
# update.sh

# Configuration
APP_DIR="/opt/messaging-app"
BACKUP_DIR="$APP_DIR/backups/pre-update-$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="/var/log/messaging-app-update.log"
REPO_URL="git@github.com:organization/messaging-app.git"
BRANCH="main"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting update process..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
log "Backing up configuration..."
cp -r $APP_DIR/config $BACKUP_DIR/

# Backup docker-compose file
cp $APP_DIR/docker-compose.yml $BACKUP_DIR/

# Backup .env file
cp $APP_DIR/.env $BACKUP_DIR/

# Get current version
CURRENT_VERSION=$(cd $APP_DIR/app && git describe --tags --always)
log "Current version: $CURRENT_VERSION"

# Pull latest changes
log "Pulling latest changes..."
cd $APP_DIR/app
git fetch origin
git checkout $BRANCH
git pull

# Get new version
NEW_VERSION=$(git describe --tags --always)
log "New version: $NEW_VERSION"

if [ "$CURRENT_VERSION" == "$NEW_VERSION" ]; then
  log "Already at the latest version. No update needed."
  exit 0
fi

# Check for database migrations
if [ -d "$APP_DIR/app/migrations" ]; then
  log "Checking for database migrations..."
  MIGRATION_COUNT=$(find $APP_DIR/app/migrations -name "*.js" -newer $BACKUP_DIR | wc -l)
  
  if [ $MIGRATION_COUNT -gt 0 ]; then
    log "Found $MIGRATION_COUNT new migrations to run."
  fi
fi

# Update dependencies
log "Updating dependencies..."
cd $APP_DIR/app
docker run --rm -v $(pwd):/app -w /app node:18-alpine npm install --production

# Stop services
log "Stopping services..."
cd $APP_DIR
docker-compose down

# Start services with new version
log "Starting services with new version..."
docker-compose build
docker-compose up -d

# Wait for services to start
log "Waiting for services to start..."
sleep 10

# Run database migrations if needed
if [ $MIGRATION_COUNT -gt 0 ]; then
  log "Running database migrations..."
  docker-compose exec api node migrations/index.js
fi

# Check health
log "Checking application health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$HEALTH_CHECK" == "200" ]; then
  log "Health check passed!"
else
  log "Health check failed! Rolling back..."
  
  # Roll back to previous version
  cd $APP_DIR
  docker-compose down
  
  # Restore config files
  cp -r $BACKUP_DIR/config $APP_DIR/
  cp $BACKUP_DIR/docker-compose.yml $APP_DIR/
  cp $BACKUP_DIR/.env $APP_DIR/
  
  # Checkout previous version
  cd $APP_DIR/app
  git checkout $CURRENT_VERSION
  
  # Start services with old version
  cd $APP_DIR
  docker-compose up -d
  
  log "Rollback completed. System is back to version $CURRENT_VERSION"
  exit 1
fi

log "Update completed successfully to version $NEW_VERSION!"
```

2. **Update Announcement Template**
```
# System Update Announcement

Dear users,

We will be performing a system update on [DATE] at [TIME] (UTC). The update is expected to take approximately [DURATION] minutes.

## What's New
- [Feature 1]: Description of new feature
- [Feature 2]: Description of new feature
- [Bug Fix 1]: Description of bug fix
- [Bug Fix 2]: Description of bug fix

## Impact During Update
During the update, the following functionalities will be temporarily unavailable:
- Sending and receiving messages
- Uploading new media
- Searching for content

Existing conversations and media will not be affected and will be available after the update.

## Action Required
Please complete any ongoing uploads before the update time to prevent data loss.

Thank you for your understanding and patience.

The Messaging Team
```

3. **Rollback Plan**
```
# Rollback Plan

## Triggers for Rollback
- Health check failure after update
- Critical functionality not working
- Data integrity issues
- Unacceptable performance degradation

## Rollback Process
1. Decision to rollback made by [RESPONSIBLE PERSON]
2. Execute rollback script:
   ```
   cd /opt/messaging-app
   ./scripts/rollback.sh [VERSION]
   ```
3. Verify system functionality after rollback
4. Notify users of rollback

## Post-Rollback Actions
1. Analyze logs to determine update failure cause
2. Create issues in tracking system for identified problems
3. Schedule patch release to address issues
4. Update deployment scripts if needed
```

---

# 15. Cost Analysis

## 15.1 Initial Setup Costs

One-time costs for setting up the system:

```
# Initial Setup Costs

## Infrastructure
- VPS Setup: $0 (using existing provider)
- Domain Name: $10/year
- SSL Certificate: $0 (Let's Encrypt)

## Development
- Mobile App Development: Internal Cost
- Backend Development: Internal Cost
- UI/UX Design: Internal Cost

## Software Licenses
- All software components are open source: $0

## Total Initial Cost: $10
```

## 15.2 Monthly Operating Costs

Ongoing costs for operating the system:

```
# Monthly Operating Costs

## Infrastructure (Based on 20 Users)
- VPS Hosting: $20-40/month (4 vCPUs, 8GB RAM, 160GB SSD)
- Bandwidth: Included in VPS cost (3TB transfer)
- Backup Storage: $5/month (100GB)

## Services
- Domain Name: ~$0.83/month ($10/year amortized)
- Monitoring: $0 (using self-hosted Prometheus/Grafana)

## Maintenance
- Security Updates: Internal Cost
- Bug Fixes: Internal Cost
- Feature Development: Internal Cost

## Total Monthly Cost: $25-45
```

## 15.3 Scaling Costs

Projected costs as the system scales:

```
# Scaling Costs

## User Base: 50 Users
- VPS Upgrade: $40-60/month (8 vCPUs, 16GB RAM, 320GB SSD)
- Additional Storage: $10/month (200GB)
- Total Monthly Cost: $50-70/month

## User Base: 100 Users
- VPS Upgrade: $80-100/month (16 vCPUs, 32GB RAM, 640GB SSD)
- Additional Storage: $20/month (400GB)
- CDN Costs: $10/month
- Total Monthly Cost: $110-130/month

## User Base: 200+ Users
- Multiple Server Deployment: $160-200/month
  - API Servers: $60-80/month
  - Database Servers: $60-80/month
  - Media Processing: $40-60/month
- Storage: $40/month (800GB)
- CDN Costs: $20/month
- Load Balancer: $10/month
- Total Monthly Cost: $230-270/month

## Cost-Saving Strategies
- Implement tiered storage (hot/cold) to minimize active storage costs
- Add optional limits for user storage quotas
- Optimize media compression to reduce storage needs
- Implement automatic cleanup of unused media variants
```

---

# 16. Future Enhancements

## 16.1 Feature Roadmap

Planned enhancements for future versions:

```
# Feature Roadmap

## Phase 1: Core Enhancements (Q2 2025)
- End-to-end encryption for all messages
- Advanced message formatting (markdown, code blocks)
- Improved link previews with metadata extraction
- Message reactions and emoji support
- Read receipt settings and control

## Phase 2: Media Improvements (Q3 2025)
- Basic image editing capabilities
- Smart photo albums based on AI analysis
- Video trimming and basic editing
- Automatic transcription for voice messages
- Annotation tools for media collaboration

## Phase 3: Collaboration Features (Q4 2025)
- Shared media collections with comments
- Collaborative folders for project-based sharing
- Media version history and comparison
- Advanced search with contextual filters
- Integration with external storage services

## Phase 4: Advanced Features (Q1 2026)
- Web client with full functionality
- Desktop apps for major platforms
- Advanced AI-powered content organization
- Integration with professional editing tools
- Advanced analytics on media usage and engagement
```

## 16.2 Scaling Strategy

Plan for scaling the system as user base grows:

```
# Scaling Strategy

## Technical Architecture Evolution
1. **Single VPS (Current - 20 Users)**
   - All services running on one server
   - Local MinIO for storage
   - Redis for caching and queues

2. **Expanded Single Server (50 Users)**
   - Upgraded VPS with more resources
   - External block storage for media
   - Optimized indexes and queries
   - Caching improvements

3. **Split Services (100 Users)**
   - Separate API and WebSocket servers
   - Dedicated media processing server
   - MongoDB with replica set
   - Redis cluster for caching

4. **Microservices (200+ Users)**
   - API Gateway pattern
   - Service-specific databases
   - Kubernetes orchestration
   - Distributed media processing
   - CDN integration for media delivery

## Database Scaling
1. **Optimization Phase**
   - Implement read/write splitting
   - Add caching layers
   - Optimize indexes and queries

2. **Replication Phase**
   - Add MongoDB replica sets
   - Implement read preference routing
   - Add Redis cluster

3. **Sharding Phase**
   - Implement MongoDB sharding
   - Shard by conversation for even distribution
   - Implement cross-shard queries for search

## Media Storage Scaling
1. **Storage Optimization**
   - Implement tiered storage (hot/cold)
   - Add automatic archiving for old media
   - Optimize compression algorithms

2. **Storage Distribution**
   - Distribute media across multiple storage nodes
   - Implement MinIO distributed mode
   - Add cache servers in front of storage

3. **CDN Integration**
   - Add CDN for frequently accessed media
   - Implement signed URLs for security
   - Geographic distribution of assets

## Operational Scaling
1. **Monitoring Expansion**
   - Add detailed per-service monitoring
   - Implement automated scaling triggers
   - Enhance alerting system

2. **Deployment Improvements**
   - Implement CI/CD pipeline
   - Add blue/green deployments
   - Automated testing before deployment

3. **Support Scaling**
   - Add in-app feedback and reporting
   - Implement automated issue categorization
   - Add usage analytics and error tracking
```

---

# 17. Appendices

## 17.1 API Reference

Reference documentation for the API endpoints:

```
# API Reference

## Authentication Endpoints

### POST /api/auth/register
Create a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "deviceId": "string",
  "deviceName": "string",
  "platform": "string"
}
```

**Response: 201 Created**
```json
{
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "profilePicture": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

### POST /api/auth/login
Authenticate a user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "deviceId": "string",
  "deviceName": "string",
  "platform": "string"
}
```

**Response: 200 OK**
```json
{
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "profilePicture": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

### POST /api/auth/refresh
Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "string",
  "deviceId": "string"
}
```

**Response: 200 OK**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

### POST /api/auth/logout
Log out a user from the current device.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "message": "Logged out successfully"
}
```

## User Endpoints

### GET /api/users/me
Get the current user's profile.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePicture": "string",
  "lastActive": "string",
  "status": "string",
  "devices": [
    {
      "deviceId": "string",
      "name": "string",
      "platform": "string",
      "lastActive": "string"
    }
  ]
}
```

### PUT /api/users/me
Update the current user's profile.

**Request Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "username": "string",
  "profilePicture": "string",
  "status": "string"
}
```

**Response: 200 OK**
```json
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "profilePicture": "string",
  "lastActive": "string",
  "status": "string"
}
```

### GET /api/users/:id
Get another user's profile.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "_id": "string",
  "username": "string",
  "profilePicture": "string",
  "lastActive": "string",
  "status": "string"
}
```

## Conversation Endpoints

### GET /api/conversations
Get all conversations for the current user.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
[
  {
    "_id": "string",
    "name": "string",
    "type": "string",
    "participantIds": ["string"],
    "participants": [
      {
        "_id": "string",
        "username": "string",
        "profilePicture": "string"
      }
    ],
    "lastMessage": {
      "senderId": "string",
      "content": "string",
      "timestamp": "string"
    },
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### POST /api/conversations
Create a new conversation.

**Request Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "name": "string",
  "participantIds": ["string"]
}
```

**Response: 201 Created**
```json
{
  "_id": "string",
  "name": "string",
  "type": "string",
  "participantIds": ["string"],
  "participants": [
    {
      "_id": "string",
      "username": "string",
      "profilePicture": "string"
    }
  ],
  "createdAt": "string",
  "updatedAt": "string"
}
```

### GET /api/conversations/:id
Get a specific conversation.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "_id": "string",
  "name": "string",
  "type": "string",
  "participantIds": ["string"],
  "participants": [
    {
      "_id": "string",
      "username": "string",
      "profilePicture": "string"
    }
  ],
  "lastMessage": {
    "senderId": "string",
    "content": "string",
    "timestamp": "string"
  },
  "createdAt": "string",
  "updatedAt": "string"
}
```

### GET /api/conversations/:id/messages
Get messages for a specific conversation.

**Request Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- limit: number (default: 50)
- before: string (timestamp)

**Response: 200 OK**
```json
[
  {
    "_id": "string",
    "conversationId": "string",
    "senderId": "string",
    "sender": {
      "_id": "string",
      "username": "string",
      "profilePicture": "string"
    },
    "content": "string",
    "type": "string",
    "mediaIds": ["string"],
    "media": [
      {
        "_id": "string",
        "type": "string",
        "variants": [
          {
            "type": "string",
            "url": "string"
          }
        ]
      }
    ],
    "status": {
      "delivered": [
        {
          "userId": "string",
          "timestamp": "string"
        }
      ],
      "read": [
        {
          "userId": "string",
          "timestamp": "string"
        }
      ]
    },
    "createdAt": "string"
  }
]
```

## Message Endpoints

### POST /api/messages
Send a new message.

**Request Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "conversationId": "string",
  "content": "string",
  "type": "string",
  "mediaIds": ["string"],
  "replyTo": "string",
  "clientId": "string"
}
```

**Response: 201 Created**
```json
{
  "_id": "string",
  "conversationId": "string",
  "senderId": "string",
  "content": "string",
  "type": "string",
  "mediaIds": ["string"],
  "replyTo": "string",
  "status": {
    "delivered": [],
    "read": []
  },
  "createdAt": "string"
}
```

### PUT /api/messages/:id
Edit a message.

**Request Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "content": "string"
}
```

**Response: 200 OK**
```json
{
  "_id": "string",
  "conversationId": "string",
  "senderId": "string",
  "content": "string",
  "type": "string",
  "mediaIds": ["string"],
  "replyTo": "string",
  "status": {
    "delivered": [],
    "read": []
  },
  "metadata": {
    "edited": true,
    "editedAt": "string"
  },
  "createdAt": "string",
  "updatedAt": "string"
}
```

### DELETE /api/messages/:id
Delete a message.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "message": "Message deleted successfully"
}
```

### POST /api/messages/:id/read
Mark a message as read.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "message": "Message marked as read"
}
```

## Media Endpoints

### POST /api/media/upload
Initiate a media upload.

**Request Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "conversationId": "string",
  "type": "string",
  "filename": "string",
  "size": "number",
  "mimeType": "string",
  "width": "number",
  "height": "number"
}
```

**Response: 200 OK**
```json
{
  "mediaId": "string",
  "uploadUrl": "string",
  "objectName": "string",
  "expiresIn": "number"
}
```

### POST /api/media/:id/confirm
Confirm media upload completion.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "mediaId": "string",
  "status": "string",
  "message": "string"
}
```

### GET /api/media/:id
Get media metadata.

**Request Headers:**
- Authorization: Bearer {token}

**Response: 200 OK**
```json
{
  "_id": "string",
  "conversationId": "string",
  "uploaderId": "string",
  "type": "string",
  "originalFilename": "string",
  "size": "number",
  "mimeType": "string",
  "dimensions": {
    "width": "number",
    "height": "number"
  },
  "variants": [
    {
      "type": "string",
      "url": "string",
      "width": "number",
      "height": "number",
      "format": "string",
      "size": "number"
    }
  ],
  "metadata": {
    "exif": {},
    "aiTags": ["string"],
    "customTags": ["string"]
  },
  "peopleTagged": ["string"],
  "processingStatus": "string",
  "uploadedAt": "string",
  "processedAt": "string"
}
```

### GET /api/media/:id/:variant
Get a specific media variant.

**Request Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- stream: boolean (default: false)

**Response: 200 OK**
- If stream=false: Returns a presigned URL
```json
{
  "mediaId": "string",
  "variant": "string",
  "url": "string",
  "expiresIn": "number"
}
```
- If stream=true: Returns the media file with appropriate Content-Type header

## Search Endpoints

### GET /api/search
Search across messages, media, and users.

**Request Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- query: string
- type: string (all, messages, media, users)
- conversationId: string
- from: string (date)
- to: string (date)
- mediaType: string
- limit: number
- offset: number

**Response: 200 OK**
```json
{
  "messages": [
    {
      "_id": "string",
      "conversationId": "string",
      "senderId": "string",
      "sender": {
        "_id": "string",
        "username": "string",
        "profilePicture": "string"
      },
      "content": "string",
      "createdAt": "string"
    }
  ],
  "media": [
    {
      "_id": "string",
      "conversationId": "string",
      "uploaderId": "string",
      "uploader": {
        "_id": "string",
        "username": "string",
        "profilePicture": "string"
      },
      "type": "string",
      "variants": [
        {
          "type": "string",
          "url": "string"
        }
      ],
      "uploadedAt": "string"
    }
  ],
  "users": [
    {
      "_id": "string",
      "username": "string",
      "profilePicture": "string",
      "lastActive": "string"
    }
  ]
}
```

### GET /api/search/ai
AI-powered search for media content.

**Request Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- query: string
- conversationId: string
- from: string (date)
- to: string (date)
- limit: number
- offset: number

**Response: 200 OK**
```json
{
  "query": "string",
  "concepts": ["string"],
  "results": [
    {
      "_id": "string",
      "conversationId": "string",
      "uploaderId": "string",
      "uploader": {
        "_id": "string",
        "username": "string",
        "profilePicture": "string"
      },
      "type": "string",
      "variants": [
        {
          "type": "string",
          "url": "string"
        }
      ],
      "metadata": {
        "aiTags": ["string"]
      },
      "uploadedAt": "string"
    }
  ],
  "total": "number"
}
```
```

## 17.2 Database Schema

Detailed database schema documentation:

```
# MongoDB Schema

## User Schema

```javascript
{
  _id: ObjectId,
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  profilePicture: String,
  phone: String,
  lastActive: Date,
  status: {
    type: String,
    enum: ['available', 'away', 'busy', 'offline'],
    default: 'available'
  },
  devices: [{
    deviceId: {
      type: String,
      required: true
    },
    name: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    pushToken: String,
    lastActive: Date
  }],
  settings: {
    mediaQuality: {
      type: String,
      enum: ['low', 'standard', 'high', 'original'],
      default: 'high'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

## Conversation Schema

```javascript
{
  _id: ObjectId,
  name: String,
  type: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual'
  },
  participantIds: [{
    type: ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: ObjectId,
    ref: 'User'
  }],
  picture: String,
  lastMessage: {
    senderId: {
      type: ObjectId,
      ref: 'User'
    },
    content: String,
    type: {
      type: String,
      enum: ['text', 'media', 'link']
    },
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    retentionPeriod: {
      type: Number,
      default: null // null means forever
    }
  }
}
```

## Message Schema

```javascript
{
  _id: ObjectId,
  conversationId: {
    type: ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'media', 'link', 'system'],
    default: 'text'
  },
  content: String,
  mediaIds: [{
    type: ObjectId,
    ref: 'Media'
  }],
  replyTo: {
    type: ObjectId,
    ref: 'Message'
  },
  mentions: [{
    type: ObjectId,
    ref: 'User'
  }],
  links: [{
    url: String,
    preview: {
      title: String,
      description: String,
      image: String
    }
  }],
  status: {
    delivered: [{
      userId: {
        type: ObjectId,
        ref: 'User'
      },
      timestamp: Date
    }],
    read: [{
      userId: {
        type: ObjectId,
        ref: 'User'
      },
      timestamp: Date
    }]
  },
  metadata: {
    clientId: String,
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

## Media Schema

```javascript
{
  _id: ObjectId,
  messageId: {
    type: ObjectId,
    ref: 'Message',
    index: true
  },
  conversationId: {
    type: ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  uploaderId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    required: true,
    index: true
  },
  originalFilename: String,
  size: Number,
  mimeType: String,
  duration: Number, // For video/audio (seconds)
  dimensions: {
    width: Number,
    height: Number
  },
  variants: [{
    type: {
      type: String,
      enum: ['thumbnail', 'preview', 'high', 'original']
    },
    url: String,
    width: Number,
    height: Number,
    size: Number,
    format: String
  }],
  metadata: {
    exif: Object, // Camera data, location, etc.
    aiTags: [String], // Generated tags
    customTags: [String] // User-defined tags
  },
  peopleTagged: [{
    type: ObjectId,
    ref: 'User'
  }],
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: Date,
  accessLevel: {
    type: String,
    enum: ['public', 'conversation', 'sender'],
    default: 'conversation'
  }
}
```

## RefreshToken Schema

```javascript
{
  _id: ObjectId,
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: Date
}
```

## SearchIndex Schema

```javascript
{
  _id: ObjectId,
  itemType: {
    type: String,
    enum: ['message', 'media', 'user'],
    required: true,
    index: true
  },
  itemId: {
    type: ObjectId,
    required: true,
    index: true
  },
  conversationId: {
    type: ObjectId,
    ref: 'Conversation',
    index: true
  },
  text: {
    type: String,
    index: 'text'
  },
  tags: [{
    type: String,
    index: true
  }],
  participants: [{
    type: ObjectId,
    ref: 'User',
    index: true
  }],
  timestamp: {
    type: Date,
    index: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    index: true
  }
}
```
```

## 17.3 Configuration Files

Sample configuration files:

```
# Configuration Files

## .env (Environment Variables)

```
# Application
NODE_ENV=production
PORT=3000
API_URL=https://example.com/api
SOCKET_URL=wss://example.com

# Authentication
JWT_SECRET=your_strong_jwt_secret_key
JWT_REFRESH_SECRET=your_strong_refresh_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
MONGO_URI=mongodb://mongo:27017/messagingapp
MONGO_USER=mongouser
MONGO_PASSWORD=mongopassword

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=miniopassword
MINIO_USE_SSL=false

# Media Processing
MEDIA_PROCESSING_CONCURRENCY=2
MEDIA_STORAGE_QUOTA=10737418240 # 10GB in bytes
MEDIA_SIGNATURE_KEY=your_strong_signature_key

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=strong_grafana_password

# Feature flags
ENABLE_CONTENT_MODERATION=true
ENABLE_AI_TAGGING=true
```

## config.js (Application Configuration)

```javascript
require('dotenv').config();

module.exports = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiUrl: process.env.API_URL,
  socketUrl: process.env.SOCKET_URL,
  
  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Database
  mongo: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379
  },
  
  // MinIO
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    useSSL: process.env.MINIO_USE_SSL === 'true'
  },
  
  // Media Processing
  media: {
    processingConcurrency: parseInt(process.env.MEDIA_PROCESSING_CONCURRENCY, 10) || 2,
    storageQuota: parseInt(process.env.MEDIA_STORAGE_QUOTA, 10) || 10737418240, // 10GB in bytes
    tempDir: process.env.TEMP_DIR || '/tmp',
    signatureKey: process.env.MEDIA_SIGNATURE_KEY
  },
  
  // Feature flags
  features: {
    contentModeration: process.env.ENABLE_CONTENT_MODERATION === 'true',
    aiTagging: process.env.ENABLE_AI_TAGGING === 'true'
  }
};
```

## nginx.conf (Nginx Configuration)

```nginx
# /etc/nginx/conf.d/messaging-app.conf
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name example.com www.example.com;
    
    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Path for static files
    root /var/www/html;
    
    # Mobile app API
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }
    
    # WebSocket for real-time messaging
    location /socket.io/ {
        proxy_pass http://socket:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s; # 24 hour timeout for long-polling
    }
    
    # Media serving with optimized cache
    location /media/ {
        proxy_pass http://api:3000/media/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache settings for media
        proxy_cache media_cache;
        proxy_cache_valid 200 302 30d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        proxy_cache_background_update on;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # Frontend app
    location / {
        try_files $uri $uri/ /index.html;
        expires 1d;
    }
    
    # Optimize for large media uploads
    client_max_body_size 100m;
    client_body_timeout 300s;
    client_body_in_file_only clean;
    client_body_buffer_size 128k;
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}

# Cache definition
proxy_cache_path /var/cache/nginx/media_cache levels=1:2 keys_zone=media_cache:10m max_size=10g inactive=30d use_temp_path=off;
```

## redis.conf (Redis Configuration)

```
# /etc/redis/redis.conf
bind 127.0.0.1
protected-mode yes
port 6379

# Memory optimizations
maxmemory 512mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Performance optimizations
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Connection optimization
timeout 0
tcp-keepalive 300
```

## mongod.conf (MongoDB Configuration)

```yaml
# /etc/mongod.conf
storage:
  dbPath: /data/db
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: enabled

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
```
```

## 17.4 Code Samples

Key code samples for reference:

```
# Code Samples

## React Native Progressive Image Component

```javascript
// ProgressiveImage.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useSelector } from 'react-redux';

const ProgressiveImage = ({
  mediaId,
  style,
  resizeMode = FastImage.resizeMode.cover,
  onLoadComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [currentQuality, setCurrentQuality] = useState('thumbnail');
  const [highResLoading, setHighResLoading] = useState(false);
  
  const mediaItem = useSelector(state => state.media.mediaMap[mediaId]);
  const mediaQualityPreference = useSelector(state => state.settings.mediaQuality);
  
  // Get URLs for each quality level
  const getUrlForVariant = (variantType) => {
    if (!mediaItem || !mediaItem.variants) return null;
    
    const variant = mediaItem.variants.find(v => v.type === variantType);
    return variant ? variant.url : null;
  };
  
  const thumbnailUrl = getUrlForVariant('thumbnail');
  const previewUrl = getUrlForVariant('preview');
  const highResUrl = getUrlForVariant('high');
  const originalUrl = getUrlForVariant('original');
  
  // Determine target quality based on user preference
  const getTargetQuality = () => {
    switch (mediaQualityPreference) {
      case 'low':
        return 'thumbnail';
      case 'standard':
        return 'preview';
      case 'high':
        return 'high';
      case 'original':
        return 'original';
      default:
        return 'high';
    }
  };
  
  // Get URL for current quality level
  const getCurrentUrl = () => {
    switch (currentQuality) {
      case 'thumbnail':
        return thumbnailUrl;
      case 'preview':
        return previewUrl;
      case 'high':
        return highResUrl;
      case 'original':
        return originalUrl;
      default:
        return thumbnailUrl;
    }
  };
  
  // Progressive loading
  useEffect(() => {
    if (!loading && currentQuality !== getTargetQuality()) {
      // Determine next quality level
      let nextQuality;
      
      if (currentQuality === 'thumbnail') {
        nextQuality = 'preview';
      } else if (currentQuality === 'preview' && 
                (getTargetQuality() === 'high' || getTargetQuality() === 'original')) {
        nextQuality = 'high';
      } else if (currentQuality === 'high' && getTargetQuality() === 'original') {
        nextQuality = 'original';
      } else {
        return; // No need to upgrade further
      }
      
      // Check if we have the URL for next quality
      const nextUrl = getUrlForVariant(nextQ