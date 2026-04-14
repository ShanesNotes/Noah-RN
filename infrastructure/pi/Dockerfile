FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    jq \
    procps \
    tini \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @mariozechner/pi-coding-agent@0.66.1

RUN mkdir -p /runtime /pi-home/agent

WORKDIR /runtime

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
