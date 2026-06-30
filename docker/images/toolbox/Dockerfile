# Dev-only toolbox image: Python + on-demand tooling, run via the `toolbox`
# compose service. Keeps these tools off the host — everything runs in Docker.
# Currently used for SVG -> PNG rasterising (rsvg-convert / librsvg).
FROM python:3.12-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends librsvg2-bin \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
