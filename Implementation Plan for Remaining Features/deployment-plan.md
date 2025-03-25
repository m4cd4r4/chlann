# Deployment and Cost Optimization Plan

## Infrastructure Requirements

For a 20-user WhatsApp/Viber clone focused on high-resolution media, a single moderate VPS is sufficient:

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| VPS | 4 vCPU, 8GB RAM, 160GB SSD | $20-40 |
| Object Storage | MinIO (self-hosted) | $0 (included) |
| Database | MongoDB (self-hosted) | $0 (included) |
| Domain Name | Custom domain | $1-2 |
| SSL Certificate | Let's Encrypt | $0 |
| **Total** | | **$21-42/month** |

## VPS Provider Options

1. **DigitalOcean**
   - Droplet: 4GB RAM, 2 vCPU, 80GB SSD - $24/month
   - Spaces: 250GB storage - $5/month
   - Total: ~$29/month

2. **Linode**
   - Dedicated 4GB plan: 4GB RAM, 2 vCPU, 80GB SSD - $20/month
   - Object Storage: 250GB - $5/month
   - Total: ~$25/month

3. **Hetzner Cloud** (Best value)
   - CPX31: 8GB RAM, 4 vCPU, 160GB SSD - €19.90/month (~$22/month)
   - Optional: Additional block storage if needed - €4.29/month for 100GB
   - Total: ~$22-27/month

## Server Setup Checklist

1. **Base System Configuration**
   - Ubuntu Server 22.04 LTS
   - UFW firewall configuration
   - Fail2ban for security
   - Docker and Docker Compose

2. **Docker Containers Setup**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   
   services:
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx/conf.d:/etc/nginx/conf.d
         - ./nginx/ssl:/etc/nginx/ssl
         - ./static:/var/www/html
       depends_on:
         - api
       restart: always
       networks:
         - app-network
   
     api:
       build: ./backend
       volumes:
         - ./backend:/app
         - ./uploads:/app/uploads
       environment:
         - NODE_ENV=production
         - MONGO_URI=mongodb://mongo:27017/messageapp
         - REDIS_HOST=redis
         - MINIO_ENDPOINT=minio
         - MINIO_ACCESS_KEY=minioadmin
         - MINIO_SECRET_KEY=minioadmin
       depends_on:
         - mongo
         - redis
         - minio
       restart: always
       networks:
         - app-network
   
     mongo:
       image: mongo:5
       volumes:
         - mongo-data:/data/db
       command: --wiredTigerCacheSizeGB 2
       restart: always
       networks:
         - app-network
   
     redis:
       image: redis:alpine
       volumes:
         - redis-data:/data
       restart: always
       networks:
         - app-network
   
     minio:
       image: minio/minio
       volumes:
         - minio-data:/data
       environment:
         - MINIO_ROOT_USER=minioadmin
         - MINIO_ROOT_PASSWORD=minioadmin
       command: server /data --console-address ":9001"
       ports:
         - "9000:9000"
         - "9001:9001"
       restart: always
       networks:
         - app-network
   
   volumes:
     mongo-data:
     redis-data:
     minio-data:
   
   networks:
     app-network:
       driver: bridge
   ```

3. **Automated Backups**
   - Daily incremental backups of MongoDB using mongodump
   - Weekly full backups of MinIO data
   - Backups stored on separate volume

## Storage Optimization Strategy

1. **Media Variant Policy**
   - Thumbnail (300px): Keep forever
   - Preview (1080px): Keep forever
   - High-resolution: Configurable retention (default: 30 days)
   
2. **Storage Lifecycle Management**
   - Automatically move high-res media to "archive" after 30 days
   - Users must explicitly "pin" important high-res media to keep indefinitely
   - Implement weekly cleanup job to free space
   
3. **User Quotas**
   - Default: 1GB per user (20GB total for 20 users)
   - Adjust as needed based on usage patterns
   - Show storage usage in user settings

## Deployment Timeline

### Week 1: Base Infrastructure
- Set up VPS and network configuration
- Configure Docker environment
- Set up MongoDB, Redis, and MinIO
- Implement basic authentication system

### Week 2: Core Messaging Features
- Implement real-time messaging API
- Set up WebSocket server
- Create conversation management
- Develop basic mobile app screens

### Week 3: Media Handling
- Implement media processing pipeline
- Set up storage optimization policies
- Create media viewing experience
- Add link sharing functionality

### Week 4: Search and Polish
- Implement search functionality
- Add AI-tagging for media
- Optimize performance
- Implement monitoring and logging
- Deploy to production

## Monitoring and Maintenance

1. **System Monitoring**
   - Set up Prometheus for metrics collection
   - Simple Grafana dashboard for visualization
   - Email alerts for system issues

2. **Regular Maintenance**
   - Weekly review of logs and performance
   - Monthly system updates
   - Quarterly review of storage usage and optimization

3. **Scaling Plan**
   - Identify bottlenecks early
   - Plan for vertical scaling first (larger VPS)
   - Prepare for horizontal scaling if user base grows significantly

## Cost Optimization Tips

1. **Storage Optimization**
   - Implement aggressive thumbnail compression
   - Default to storing high-resolution media for 30 days only
   - Allow users to explicitly "save" important media

2. **Resource Management**
   - Schedule resource-intensive tasks during off-peak hours
   - Implement automatic scaling down during inactive periods
   - Optimize database indexes for common queries

3. **Traffic Optimization**
   - Use HTTP/2 and Brotli compression
   - Implement aggressive caching for static resources
   - Set up proper Cache-Control headers for media
