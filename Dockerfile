# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript code
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV JELLYFIN_URL=http://jellyfin:8096
ENV JELLYFIN_API_KEY=your_jellyfin_api_key
ENV NZBGET_URL=http://nzbget:6789
ENV NZBGET_USERNAME=nzbget
ENV NZBGET_PASSWORD=tegbzn6789
ENV DEFAULT_SPEED=0
ENV CHECK_INTERVAL=30
ENV MAX_CONNECTION_SPEED=125000
ENV BUFFER_PERCENTAGE=20

# Command to run
CMD ["node", "dist/index.js"]