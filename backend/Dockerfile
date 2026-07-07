FROM node:22-alpine

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Install dev deps for build
RUN npm install typescript ts-node @types/node @types/express @types/multer @types/cors --no-save

# Build TypeScript
RUN npx tsc

# Expose port
EXPOSE 5000

# Health check (using wget since alpine lacks curl)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
