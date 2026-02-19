# AppLens Web Application Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY web/package*.json web/
RUN cd web && npm ci --only=production

# Copy application
COPY web/ ./web/

# Build the Next.js app
RUN cd web && npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["cd", "web", "&&", "npm", "run", "start"]
