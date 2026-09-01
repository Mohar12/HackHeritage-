# ============================================================
# Dashboard Dockerfile — Node 20 build → Vite preview serve
# ============================================================

# ---- Stage 1: Build -----------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (layer cached separately from source)
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source and build
COPY dashboard/ ./
RUN npm run build

# ---- Stage 2: Serve (Vite preview) --------------------------------
# Using Vite's built-in preview server to serve the production bundle.
# Swap for nginx if a heavier static server is preferred.
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only the built artefacts and minimal runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/vite.config.js ./vite.config.js

EXPOSE 5173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
