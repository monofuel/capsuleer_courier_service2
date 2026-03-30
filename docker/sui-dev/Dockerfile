# Sui dev environment: CLI, local node, Node.js
# Ubuntu 24.04 required for Sui binary
FROM docker.io/library/ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    git \
    jq \
    dos2unix \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key -o /tmp/nodesource-repo.gpg.key \
    && gpg --batch --quiet --show-keys --with-colons /tmp/nodesource-repo.gpg.key | grep -q "fpr.*:6F71F525282841EEDAF851B42F59B5F99B1BE0B4:" \
    && gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg /tmp/nodesource-repo.gpg.key \
    && rm -f /tmp/nodesource-repo.gpg.key \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Sui CLI via suiup (native binary for build arch)
ENV PATH="/root/.local/bin:/root/.suiup/bin:${PATH}"
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
    && echo y | suiup install sui \
    && sui --version

# Walrus CLI + site-builder for decentralized frontend hosting
RUN curl -sSfL https://storage.googleapis.com/mysten-walrus-binaries/walrus-testnet-latest-ubuntu-x86_64 -o /usr/local/bin/walrus \
    && chmod +x /usr/local/bin/walrus \
    && curl -sSfL https://storage.googleapis.com/mysten-walrus-binaries/site-builder-testnet-latest-ubuntu-x86_64 -o /usr/local/bin/site-builder \
    && chmod +x /usr/local/bin/site-builder \
    && walrus --version && site-builder --version

WORKDIR /workspace
ENV SUI_CONFIG_DIR=/root/.sui

COPY scripts/ /opt/sui-dev/scripts/
RUN dos2unix /opt/sui-dev/scripts/*.sh && chmod +x /opt/sui-dev/scripts/*.sh

ENTRYPOINT ["/opt/sui-dev/scripts/entrypoint.sh"]
