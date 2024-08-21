FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libmagic1 libgl1 libglib2.0-0 libsm6 libxrender1 libxext6 poppler-utils tesseract-ocr libtesseract-dev && rm -rf /var/lib/apt/lists/*

# Install venv

RUN python -m venv /opt/venv
VOLUME /var/lib/containers
# Activate venv

ENV PATH="/opt/venv/bin:$PATH"
# RUN pip install filemagic
COPY requirements.txt .

# Install dependencies in venv
RUN pip install -r requirements.txt

COPY . .

EXPOSE 9001

