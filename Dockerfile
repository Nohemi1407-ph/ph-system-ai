FROM node:20-alpine AS base
WORKDIR /app

# Dependencias
FROM base AS deps
COPY package*.json ./
RUN npm install

# Build de la app Next
FROM deps AS builder
COPY . .
RUN npm run build

# Runtime
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
