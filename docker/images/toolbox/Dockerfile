# Dev-only toolbox image: Python + Node + on-demand tooling, run via the
# `toolbox` compose service. Keeps these tools off the host — everything runs in
# Docker. Used for SVG -> PNG rasterising (rsvg-convert / librsvg) and headless
# Node scripts that import the app's pure game/AI logic (e.g. the AI benchmark).
FROM python:3.14-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends librsvg2-bin nodejs npm \
    && rm -rf /var/lib/apt/lists/*
# puppeteer-core for the screenshot tooling (screenshots/capture.mjs). It drives
# a remote Browserless Chrome over CDP, so NO browser is downloaded here.
# Installed at /node_modules (above the /app mount) so Node resolves it by
# walking up the tree, matching the app image.
WORKDIR /
COPY docker/images/toolbox/package.json ./
RUN npm install && rm -rf /root/.npm
WORKDIR /app
