# Dockerfile (алтернатива) — наметавонад лозим бошад.
# Роҳи асосӣ: Runtime=Node (native). Ин Dockerfile танҳо агар хоҳед, якдор.
# Бо Docker: Build Command → "docker build ." | Start → "node dist/app.js"
# (migrate deploy-ро дар StartCommand илова кунед: "sh -c 'npx prisma migrate deploy && node dist/app.js'")

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 10000
CMD ["node", "dist/app.js"]