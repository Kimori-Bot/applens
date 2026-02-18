# AppLens - AI-Powered SDK Testing Service
# 
# This is the backend service that receives SDK data and provides
# an API for AI agents to control testing.
#
# Usage:
#   docker build -t applens .
#   docker run -p 3002:3002 -p 3005:3005 applens
#
# Or with Docker Compose:
#   docker-compose up

FROM node:22-alpine

# Install dependencies
WORKDIR /app

# Copy package files
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/index.js ./

# Copy dashboard
COPY ../dashboard.html ./

# Expose ports
# 3002 - API server
# 3005 - Dashboard
EXPOSE 3002 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "index.js"]
