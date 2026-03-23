FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    clang \
    lld \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone the chooks-template repository (contains hook headers in contracts/utils/)
RUN git clone https://github.com/tequdev/chooks-template.git /tmp/chooks \
    && mkdir -p /app/hooks \
    && cp -r /tmp/chooks/contracts/utils/* /app/hooks/ \
    && rm -rf /tmp/chooks

# Copy your server code and package.json
COPY server.js .
COPY package*.json ./

# Install Node dependencies
RUN npm install express

# Optional: Test compilation
RUN echo '#include "hookapi.h"\nint64_t hook(uint32_t reserved) { accept(0,0,0); return 0; }' > test.c && \
    clang --target=wasm32 -O2 -I ./hooks -nostdlib -Wl,--no-entry -Wl,--export=hook -o test.wasm test.c && \
    echo "Compilation test successful" || echo "Compilation test failed"

EXPOSE 4000

CMD ["node", "server.js"]