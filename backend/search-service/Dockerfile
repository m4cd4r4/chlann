FROM --platform=linux/amd64 node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3004

CMD ["node", "src/index.js"]
