# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os package.json e package-lock.json
COPY package*.json ./

# Instala as dependências do frontend
RUN npm install

# Copia o resto do código
COPY . .

# Executa o build da aplicação (vai gerar a pasta /dist)
RUN npm run build

# --- Stage 2: Serve ---
FROM node:20-alpine

WORKDIR /app

# Instala o serve globalmente
RUN npm install -g serve

# Copia apenas os ficheiros da build do Stage 1
COPY --from=builder /app/dist ./dist

# Expõe a porta
EXPOSE 3000

# Comando de start (usando a porta 3000 e escutando globalmente)
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
