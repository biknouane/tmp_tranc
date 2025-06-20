FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install prisma CLI globally
RUN npm install prisma --save-dev

# Copy the rest of the code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port (optional but good practice)
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
