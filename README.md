# review-anything
Review Anything is a web application for document review. It leverages local large language models with ollama to allow users to chat with documents, generate rubric-like evaluation questions from a document, and answer questions about a document posed by another document while citing page numbers.

Review Anything can be run completely locally without internet access. It is highly recommended for the system running this application to have GPUs.

## Installation

### Prerequisites

#### **Required:**

* **Ollama:**
    * Install Ollama by following the instructions at [https://github.com/ollama/ollama](https://github.com/ollama/ollama).
    * Configure Ollama to listen on all network interfaces:
        * Open the Ollama service file: `sudo vim /etc/systemd/system/ollama.service`
        * Add the following line under the `[Service]` section: `Environment="OLLAMA_HOST=0.0.0.0"`
        * Reload the systemd daemon and restart Ollama:
            * `sudo systemctl daemon-reload`
            * `sudo systemctl restart ollama`
    * Install the Llama 3.1 model: `ollama pull llama3.1`
* **Podman:**
    * Install Podman version 4.6.2 or later. Refer to the official installation guide at [https://podman.io/docs/installation](https://podman.io/docs/installation).
* **Podman-Compose:**
    * Install Podman-Compose version 1.2.0 or later using pip: `pip install podman-compose`
* **Disk Space:** At least 15 GB of free disk space.

#### **Recommended:**

* **GPU:** A dedicated GPU with 5 GB or more of VRAM is recommended for optimal performance.
* **Memory:** 16 GB of system memory is recommended.

### Installation Steps

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/AI-GSFC/review-anything.git](https://github.com/AI-GSFC/review-anything.git)
   cd review-anything
   ```

2. **Run the Setup Script:**
  ```bash
  bash setup.sh
  ```
3. **Access the Application:**
  Once the terminal indicates that the frontend and backend services have started running on ports 9000 and 9001 (~3-5 min),
  navigate to http://localhost:9000 in your web browser.

4. Running in the Background:
To run in the background, exit the current terminal process from the setup.sh script and execute:
  ```bash
  podman-compose start
  ```
5. To stop the background process, run:
  ```bash
  podman-compose stop
  ```

