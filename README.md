How to Run:

Install Dependencies:

pip install websockets openai  # For the backend
# For Linux, also: sudo apt-get install xdotool (or your distro's equivalent)

Set up your OpenAI API Key: Set the OPENAI_API_KEY environment variable. For example, on Linux/macOS:

export OPENAI_API_KEY="your-openai-api-key"

On Windows:

set OPENAI_API_KEY="your-openai-api-key"

Load the Extension:

Open Chrome and go to chrome://extensions/.
Enable "Developer mode" (top right corner).
Click "Load unpacked".
Select the my_extension directory.

Run the Backend Server:

python backend/server.py

Start a Google Meet Call: Go to https://meet.google.com and start or join a meeting.

Click on the extension icon in the Chrome toolbar

Have an application open where you would like the summary text to be sent
