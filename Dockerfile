# Build stage
FROM node:25-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Enable Corepack for Yarn 4
RUN corepack enable

COPY . .

# Install dependencies and build
RUN yarn install
RUN yarn build

# Production stage
FROM node:25-slim AS runtime

WORKDIR /usr/src/app

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Enable Corepack for Yarn 4
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install production dependencies only
RUN yarn workspaces focus --production

# Copy build artifacts
COPY --from=builder /usr/src/app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads/audio

EXPOSE 3000

CMD ["yarn", "start:prod"]
