FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

EXPOSE 3100

# 重要：运行时需要挂载宿主机 Docker Socket
# docker run -d -p 3100:3100 -v /var/run/docker.sock:/var/run/docker.sock nanoclaw-kernel
CMD ["npx", "tsx", "src/api-server.ts"]
