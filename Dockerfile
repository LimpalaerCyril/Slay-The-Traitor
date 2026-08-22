FROM node:24-bookworm-slim

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./

RUN npm ci

COPY --chown=node:node . .

RUN npm run typecheck
RUN npm test

ENV NODE_ENV=production

USER node

CMD ["npm", "run", "bot"]