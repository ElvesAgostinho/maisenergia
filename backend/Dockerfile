# Usa a imagem oficial do Node.js leve
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de configuração do NPM
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia todo o código para o container
COPY . .

# Expõe a porta que o teu servidor utiliza
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
