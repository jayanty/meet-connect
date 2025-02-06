import asyncio
import websockets
import json
from openai import OpenAI  # Or any other LLM library
import subprocess
import re
import os

# --- LLM Setup (Replace with your preferred LLM) ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Replace with your API key

def summarize_transcript(transcript):
    """Summarizes a transcript using an LLM."""
    try:
        messages = [
            {
                "role": "user",
                "content": f"Summarize the following meeting transcript:\n{transcript}",
            }
        ]

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Or your preferred model
            messages=messages,
            temperature=0.2,
        )

        summary = response.choices[0].message.content
        return summary
    except Exception as e:
        print(f"Error during summarization: {e}")
        return "Error: Could not generate summary."


# --- WebSocket Server ---
async def server(websocket, path):
    print(f"Client connected: {websocket.remote_address}")
    target_window_name = None

    try:
        async for message in websocket:
            data = json.loads(message)

            if data["type"] == "transcript_update":
                transcript_chunk = data["data"]
                print(f"Received transcript chunk: {transcript_chunk[:50]}...") # Print part for brevity

                summary = summarize_transcript(transcript_chunk)
                print(f"Summary: {summary}")
                if target_window_name:
                    send_to_window(target_window_name, summary)

            elif data["type"] == "set_target_window":
                target_window_name = data["target_window"]
                print(f"Target window set to: {target_window_name}")
            elif data["type"] == "extension_ready":
                # here we can ask the user for the target window
                # This is a basic example. In a real-world scenario, you'd probably
                # want a more robust way to get user input, perhaps via a configuration file
                # or a more complex command-line interface.
                await websocket.send(json.dumps({
                    "type": "request_target_window",
                    "message": "Please enter the target window name:"
                }))

            elif data["type"] == "target_window_response":
                target_window_name = data["target_window"]
                print(f"Target window set via response: {target_window_name}")

    except websockets.exceptions.ConnectionClosedOK:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")

# --- Window Interaction (OS-Specific) ---

def send_to_window(window_name, text):
    """Sends text to a specific window.  This is HIGHLY OS-dependent."""

    # macOS (using AppleScript)
    if os.name == 'posix' and os.uname().sysname == 'Darwin':  # Check for macOS
        try:
            # Using osascript (AppleScript) to send keys. VERY rudimentary.
            #  This script targets the window by name, brings it to the front,
            #  and types the text.  A better approach would use accessibility APIs.
            script = f'''
            tell application "System Events"
                tell process "{window_name}"
                    set frontmost to true
                    keystroke "{text}"
                    keystroke return
                end tell
            end tell
            '''
            subprocess.run(["osascript", "-e", script], check=True, capture_output=True)


        except subprocess.CalledProcessError as e:
            print(f"Error sending to window (macOS): {e.stderr.decode()}")

    # Windows (using pywinauto - Requires installation)
    elif os.name == 'nt': # Windows
        try:
            from pywinauto import application
            app = application.Application().connect(title=window_name)  # Or use process ID
            app.top_window().set_focus()

            # Type the text into the window
            app.top_window().type_keys(text, with_spaces=True)
            app.top_window().type_keys("{ENTER}")


        except Exception as e:
            print(f"Error sending to window (Windows): {e}")


    # Linux (using xdotool - Requires installation)
    elif os.name == 'posix': # Linux and other POSIX-compliant systems
        try:
            # Find the window ID by its name
            window_id = subprocess.check_output(['xdotool', 'search', '--name', window_name]).decode().strip()
            if window_id:
                # Activate the window
                subprocess.run(['xdotool', 'windowactivate', window_id], check=True)
                # Type the text into the window
                subprocess.run(['xdotool', 'type', '--clearmodifiers', text], check=True)
                subprocess.run(['xdotool', 'key', 'Return'], check=True)

            else:
                print(f"Window not found: {window_name}")
        except subprocess.CalledProcessError as e:
            print(f"Error sending to window (Linux/xdotool): {e}")
    else:
        print("Unsupported operating system for window interaction.")


async def main():
    async with websockets.serve(server, "localhost", 8765):
        print("WebSocket server started on ws://localhost:8765")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
