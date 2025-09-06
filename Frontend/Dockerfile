FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev"]
