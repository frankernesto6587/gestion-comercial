FROM node:20-alpine AS base

# Instalar dependencias necesarias
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate

# ========================================
# Etapa: Dependencias
# ========================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# ========================================
# Etapa: Desarrollo
# ========================================
FROM base AS dev
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml* ./

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Script de inicio que instala dependencias y arranca el servidor
CMD sh -c "pnpm install && pnpm prisma generate && pnpm dev"

# ========================================
# Etapa: Builder (para producción)
# ========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar cliente Prisma
RUN pnpm prisma generate

# Build de Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ========================================
# Etapa: Runner (producción)
# ========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copiar archivos de build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma para migraciones en producción
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
