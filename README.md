# Review Anything

Review Anything is a local AI-powered document reviewer. It leverages the capabilities of large language models via Ollama, allowing you interact with and evaluate documents.
<table style="border: none;">
<tr>
<td><img src="https://github.com/user-attachments/assets/eb85c357-2c40-47bb-8e20-8274a8330fe0" alt="Document Chat Example" style="width: 800px;">
<p style="text-align: center;">Document Chat Example</p>
</td>
<td><img src="https://github.com/user-attachments/assets/37e1620c-9e69-46a4-a47d-0a43ae47bde2" alt="Question Answering Example" style="width: 800px;">
<p style="text-align: center;">Question Answering Example</p>
</td>
</tr>
</table>


## ✨ Key Features

* **Question and Answer Generation:** Craft and answer questions for any document with citations, guided by a rubric document.
* **Interactive Document Chat:** Chat with your documents through conversations. Ask questions, seek summaries, etc. all with cited sources.
* **Model Flexibility:** Opt to choose more powerful or weaker models by choosing from a wide array of large language models in the Ollama library.
* **Control:** Customize model behavior by adjusting temperature and prompts to achieve the ideal balance of creativity and accuracy.
* **Source Management:** Change the number of document sources the model draws from when formulating responses.
* **Intuitive Interface:** Navigate a user-friendly, resizeable workspace with a built-in PDF viewer, allowing for easy cross-referencing of model citations and original text.
* **Offline Functionality:** Work with without an internet connection, ensure data privacy and maximum uptime.

## 🚀 Local Installation

### Prerequisites

#### Must-Haves:

* **Ollama:**
    * Follow the installation guide at: https://github.com/ollama/ollama
    * Configure Ollama to listen on all network interfaces:
        * `sudo vim /etc/systemd/system/ollama.service`
        * Add `Environment="OLLAMA_HOST=0.0.0.0"` under the `[Service]` section
        * `sudo systemctl daemon-reload`
        * `sudo systemctl restart ollama`
    * Install the Llama 3.1 model: `ollama pull llama3.1`
* **Podman:** Version 4.6.2 or later (https://podman.io/docs/installation)
* **Podman-Compose:** Version 1.2.0 or later (`pip install podman-compose`)
* **Disk Space:** A minimum of 15 GB of free space.

#### Nice-to-Haves:

* **GPU:** A dedicated GPU with 8+ GB VRAM for optimal performance with llama3.1 8B.
* **Memory:** 16 GB of system memory for smooth operation.

### Install review anything

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/AI-GSFC/review-anything.git
   cd review-anything
   ```

2. **Run the Setup Script:**
  ```bash
  bash setup.sh
  ```
3. **Access the Application:**
  Once the terminal indicates that the frontend and backend services have started running on ports 9000 and 9001 (after ~3-5 min),
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

For more detailed documentation, please refer to the [Review Anything Detailed Documentation](https://docs.google.com/document/d/1bnUrPJ8PPX8_4Jra3QLFk1232ffgnMcLsibvX0E1zyQ/edit?usp=sharing).
