FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV QLCPLUS_MCP_ENV_FILE=/config/.env

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY PROMPT.md ./PROMPT.md
COPY config /config

EXPOSE 8788/tcp
EXPOSE 9000/udp

CMD ["node", "dist/src/index.js"]
