FROM node:22.23.1-bookworm-slim AS node-runtime

FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:577.0.0-stable@sha256:8422b1679a9689a66ae87e828eca2e57a43b6d6b0a47ab92d46c4c6b970c1d39

# The reporting scripts are dependency-free Node programs, but their
# privacy-safe BigQuery staging/MERGE path intentionally shells out to bq.
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node

RUN node --version \
  && bq version

WORKDIR /app

COPY package.json ./
COPY scripts/cloud-dashboard-jobs.mjs ./scripts/cloud-dashboard-jobs.mjs
COPY scripts/campspot-email-ingest.mjs ./scripts/campspot-email-ingest.mjs
COPY scripts/dashboard-reporting.mjs ./scripts/dashboard-reporting.mjs
COPY scripts/dashboard-serving.mjs ./scripts/dashboard-serving.mjs
COPY scripts/lib/ ./scripts/lib/
COPY config/dashboard/campspot-inventory-map.json ./config/dashboard/campspot-inventory-map.json

ENV NODE_ENV=production
ENV CAMPSPOT_INVENTORY_MAP_PATH=/app/config/dashboard/campspot-inventory-map.json

ENTRYPOINT ["node", "scripts/cloud-dashboard-jobs.mjs"]
CMD ["campspot"]
