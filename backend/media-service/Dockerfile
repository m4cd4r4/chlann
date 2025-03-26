FROM --platform=linux/amd64 node:18-alpine

# Install system dependencies required for image/video processing
RUN apk add --no-cache \
    ffmpeg \
    vips-dev \
    build-base \
    python3

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3003

CMD ["node", "src/index.js"]
