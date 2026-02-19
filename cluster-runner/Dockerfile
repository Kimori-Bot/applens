# AppLens Cluster Runner
# 
# This is the simulator cluster runner that can be run:
# 1. As a standalone Node.js service
# 2. As a Docker container (for cloud deployments)
# 3. On user's local machine (for local testing)
#
# For local/user clusters, just run:
#   npm install
#   npm start

FROM node:22-alpine

# Install dependencies for Android/iOS automation
RUN apk add --no-cache \
    android-tools \
    adb \
    chromium \
    chromium-chromedriver \
    nodejs \
    npm

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose Appium default port
EXPOSE 4723

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4723/wd/hub/status', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the cluster runner service
CMD ["node", "src/index.js"]
