FROM node:20-alpine

WORKDIR /app

# Dependencies will be installed later using volumes with docker-compose
# For a production build, you would copy package.json and run npm install here.
# But for local dev with docker-compose, we mount the volume.

# Make sure we have a command to just keep it alive if needed, or run dev
CMD npm install && npm run dev
