FROM node:16-alpine
ENV NODE_ENV=production

WORKDIR /app

COPY dist ./dist
COPY package.json .

RUN npm install --production
COPY .env .

CMD ["node", "dist/index.js"]