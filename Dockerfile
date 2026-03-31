# ─── ETAPA 1: BUILDER (Imagen completa con Python y G++) ───
FROM node:20 AS builder
WORKDIR /app

# 1. Copiar package.json
COPY package*.json ./

# 2. Instalar dependencias (Ahora sí compilará bcrypt sin errores)
RUN npm install

# 3. Copiar código fuente y compilar
COPY . .
RUN npm run build

# 4. Limpiar dependencias de desarrollo
RUN npm prune --omit=dev


# ─── ETAPA 2: PRODUCCIÓN (Imagen ligera para correr la app) ───
FROM node:20-slim AS production
WORKDIR /app

# 1. Copiar package.json
COPY package*.json ./

# 2. Copiar node_modules ya compilados desde el builder
COPY --from=builder /app/node_modules ./node_modules

# 3. Copiar el código transpilado a JS
COPY --from=builder /app/dist ./dist

# 4. Configurar puerto y arrancar
EXPOSE 3000
CMD ["node", "dist/main"]