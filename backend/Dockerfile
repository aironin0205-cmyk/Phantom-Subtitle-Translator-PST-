// ===== PRODUCTION-READY DOCKERFILE =====

# ===== STAGE 1: Build Dependencies =====
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

# ===== STAGE 2: Production Image =====
FROM node:18-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
