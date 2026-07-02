FROM node:22-alpine
# Deps install at /node_modules (above the read-only /app bind mount); Node
# resolves them by walking up the tree, so nothing is written into /app.
WORKDIR /
COPY ghost-board/package.json ghost-board/package-lock.json ./
RUN npm ci
WORKDIR /app
EXPOSE 3501
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
