# =========================================
# ===  PRODUCTION-READY DOCKERFILE      ===
# =========================================
# This Dockerfile uses a multi-stage build to create a small, secure,
# and optimized image for production deployment on Render.

# --- STAGE 1: Build Dependencies ---
# This stage is named 'builder'. Its only purpose is to install production
# dependencies in a clean environment.
FROM node:18-alpine AS builder

# Set the working directory for this stage.
WORKDIR /usr/src/app

# Copy package.json and the lockfile. This leverages Docker's layer caching,
# so `npm install` only runs again if dependencies change.
COPY package*.json ./

# Install *only* production dependencies to keep the final image lean.
RUN npm install --only=production


# --- STAGE 2: Production Image ---
# This stage builds the final, lightweight image that will be deployed.
# It starts from a fresh base to avoid including any build tools.
FROM node:18-alpine

# Set the working directory for the application.
WORKDIR /usr/src/app

# Set the environment to 'production' to enable optimizations in Node.js frameworks.
ENV NODE_ENV=production

# Copy the pre-installed node_modules from the 'builder' stage.
# This is much faster and more reliable than running npm install again.
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the rest of the application source code into the image.
COPY . .

# Expose the port the application will run on. This must match the PORT
# configured in the application (and the one Render provides).
EXPOSE 3001

# The command that will be executed when the container starts.
# The array syntax is preferred as it allows Node.js to correctly receive
# signals for graceful shutdown.
CMD ["node", "server.js"]
