FROM node:12-alpine

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./

# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 5500
CMD [ "node", "index.js" ]