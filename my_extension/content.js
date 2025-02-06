const timeFormat = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  
  let transcript = [];
  let personNameBuffer = "",
    transcriptTextBuffer = "",
    timeStampBuffer = undefined;
  let beforePersonName = "",
    beforeTranscriptText = "";
  let ws = null;
  
  function setupWebSocket() {
      const serverUrl = 'ws://localhost:8765'; // Hardcoded for simplicity.  Change if needed.
      console.log("WebSocket URL:", serverUrl);
  
      ws = new WebSocket(serverUrl);
  
      ws.onopen = () => {
          console.log("WebSocket Connected");
          // Send a "ready" message when the WebSocket is connected
          ws.send(JSON.stringify({type: "extension_ready"}));
      };
  
      ws.onclose = () => {
          console.log("WebSocket Disconnected");
          setTimeout(setupWebSocket, 5000); // Attempt to reconnect.
      };
  
      ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
      };
  
      ws.onmessage = (event) => {
          // currently not listening for messages
          // console.log("Received message from server:", event.data)
      }
  }
  
  // Pushes data in the buffer to transcript array as a transcript block
  function pushBufferToTranscript() {
    transcript.push({
      personName: personNameBuffer,
      timeStamp: timeStampBuffer,
      personTranscript: transcriptTextBuffer,
    });
  }
  
  // Callback function to execute when transcription mutations are observed.
  function transcriber(mutationsList, observer) {
    mutationsList.forEach((mutation) => {
      try {
        const people =
          document.querySelector(".a4cQT")?.childNodes[1]?.firstChild
            ?.childNodes ||
          document.querySelector(".a4cQT")?.firstChild?.firstChild?.childNodes;
  
        if (people.length > 0) {
          const person = people[people.length - 1];
          const currentPersonName = person.childNodes[0].textContent;
          const currentTranscriptText =
            person.childNodes[1].lastChild.textContent;
  
          if (beforeTranscriptText == "") {
            personNameBuffer = currentPersonName;
            timeStampBuffer = new Date()
              .toLocaleString("default", timeFormat)
              .toUpperCase();
            beforeTranscriptText = currentTranscriptText;
            transcriptTextBuffer = currentTranscriptText;
          }
          else {
            if (personNameBuffer != currentPersonName) {
              pushBufferToTranscript();
  
              if (ws && ws.readyState === WebSocket.OPEN) {
                const formattedPayload = `${personNameBuffer} (${timeStampBuffer})\n${transcriptTextBuffer}\n`;
                ws.send(
                  JSON.stringify({
                    type: "transcript_update",
                    data: formattedPayload,
                  })
                );
              }
  
              beforeTranscriptText = currentTranscriptText;
              personNameBuffer = currentPersonName;
              timeStampBuffer = new Date()
                .toLocaleString("default", timeFormat)
                .toUpperCase();
              transcriptTextBuffer = currentTranscriptText;
            }
            else {
              transcriptTextBuffer = currentTranscriptText;
              beforeTranscriptText = currentTranscriptText;
              if (currentTranscriptText.length > 250) person.remove();
            }
          }
        }
        else {
          if (personNameBuffer != "" && transcriptTextBuffer != "") {
            pushBufferToTranscript();
  
            if (ws && ws.readyState === WebSocket.OPEN) {
              const formattedPayload = `${personNameBuffer} (${timeStampBuffer})\n${transcriptTextBuffer}\n`;
              ws.send(
                JSON.stringify({
                  type: "transcript_update",
                  data: formattedPayload,
                })
              );
            }
          }
          beforePersonName = "";
          beforeTranscriptText = "";
          personNameBuffer = "";
          transcriptTextBuffer = "";
        }
      } catch (error) {
          console.error("Error in transcriber:", error);
      }
    });
  }
  
  
  // Efficiently waits until the element of the specified selector and textContent appears in the DOM.
  const checkElement = async (selector, text) => {
    if (text) {
      while (
        !Array.from(document.querySelectorAll(selector)).find(
          (element) => element.textContent === text
        )
      ) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    } else {
      while (!document.querySelector(selector)) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    return document.querySelector(selector);
  };
  
  // Start observing for the meeting
  function startObserving() {
      const meetingEndIconData = {
          selector: ".google-symbols",
          text: "call_end"
      };
  
      checkElement(meetingEndIconData.selector, meetingEndIconData.text).then(() => {
          console.log("Meeting started");
          setupWebSocket();
          const transcriptTargetNode = document.querySelector(".a4cQT");
          const transcriptObserver = new MutationObserver(transcriber);
          transcriptObserver.observe(transcriptTargetNode, { childList: true, attributes: true, subtree: true });
      });
  }
  
  // Initial observation
  startObserving();
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === "start_capture") {
        startObserving();
      }
    }
  );