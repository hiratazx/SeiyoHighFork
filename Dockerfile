# HuggingFace Spaces Dockerfile
# This builds the React frontend as a static site and serves it via nginx
# The backend (Laravel) stays on your VPS - only the frontend is deployed here

# Stage 1: Build the React frontend
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables
# These can be overridden by HuggingFace Spaces secrets
ARG VITE_API_BASE_URL=https://ainime-games.com
ARG VITE_IS_HF_BUILD=true
ARG VITE_HF_AUTH_TOKEN

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_IS_HF_BUILD=$VITE_IS_HF_BUILD
ENV VITE_HF_AUTH_TOKEN=$VITE_HF_AUTH_TOKEN

# Build the frontend (HuggingFace-specific build)
RUN npm run build:hf

# Rename the HTML file to index.html (Vite preserves original filename)
RUN mv dist/index.hf.html dist/index.html

# Stage 2: Serve with nginx
FROM nginx:alpine

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.hf.conf /etc/nginx/conf.d/default.conf

# HuggingFace Spaces expects port 7860
EXPOSE 7860

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
