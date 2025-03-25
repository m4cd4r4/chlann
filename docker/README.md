# Docker Configuration for ChlannClaude

This directory contains Docker Compose configurations for running the ChlannClaude application in both development and production environments.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Development Environment

The development environment includes:

- MongoDB (database)
- Redis (caching and pub/sub)
- MinIO (S3-compatible storage)
- Media Service
- Search Service

### Starting the Development Environment

```bash
docker-compose -f docker-compose.dev.yml up
```

To run in detached mode:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Stopping the Development Environment

```bash
docker-compose -f docker-compose.dev.yml down
```

## Production Environment

The production environment includes all services from the development environment plus:

- Nginx (reverse proxy)
- Enhanced security configurations
- Environment variable support
- Logging configuration

### Setting Up the Production Environment

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your secure credentials.

### Starting the Production Environment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stopping the Production Environment

```bash
docker-compose -f docker-compose.prod.yml down
```

## Data Persistence

All data is persisted using Docker volumes:

- `mongodb_data`: MongoDB database files
- `redis_data`: Redis data
- `minio_data`: MinIO object storage

## Service Access

### Development Environment

- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- Media Service: `localhost:3001`
- Search Service: `localhost:3002`

### Production Environment

- All services are accessible through Nginx
- HTTP: `localhost:80`
- HTTPS: `localhost:443`

## Additional Configuration

For additional configuration of the Nginx reverse proxy in production, see the `nginx` directory.
