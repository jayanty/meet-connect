document.getElementById('startCapture').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: startContentScript,
      });
    });
  });
  
  // This function will be injected into the active tab
  function startContentScript() {
    chrome.runtime.sendMessage({action: "start_capture"});
  }