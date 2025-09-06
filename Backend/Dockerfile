# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the backend port (adjust if your backend runs on another port)
EXPOSE 5001

# Start the backend
CMD ["npm", "start"]
