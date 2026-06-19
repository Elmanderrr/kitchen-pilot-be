FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# create a venv to avoid PEP 668 "externally managed" errors on Debian Bookworm
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# upgrade pip tooling inside the venv
RUN pip install --upgrade pip setuptools wheel

# install paddlepaddle separately (important)
RUN pip install --no-cache-dir \
    paddlepaddle==3.0.0 \
    -f https://www.paddlepaddle.org.cn/whl/linux/cpu.html

# install OCR stack
RUN pip install --no-cache-dir \
    paddleocr==3.0.3 \
    paddlex==3.0.3 \
    langchain==0.3.30 \
    langchain-community==0.3.31

RUN npm install -g ts-node

# Node deps
COPY package*.json ./

RUN npm ci

# app
COPY . .

CMD ["npm", "run", "start:dev"]