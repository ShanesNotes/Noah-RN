FROM node:20-alpine

WORKDIR /app

COPY package.json ./
# No lockfile yet — install fresh in the image. Once a lockfile is committed
# switch to `npm ci` for reproducible builds.
RUN npm install --no-audit --no-fund

COPY . .

ENV VITE_PULSE_URL=http://pulse-sidecar:8104

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
