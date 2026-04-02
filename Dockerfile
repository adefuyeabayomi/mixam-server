# Use Node 16 (matches your project)
FROM node:16-slim

# Set working directory
WORKDIR /app

# Install yarn
RUN npm install -g yarn@1.22.21

# Copy dependency files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of your app
COPY . .

# Expose port (important for Fly)
EXPOSE 3000

# Start your app
CMD ["yarn", "start"]