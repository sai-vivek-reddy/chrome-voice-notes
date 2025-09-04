// Background script for Voice Notes Chrome Extension

let isRecording = false;

// Save note to chrome storage
async function saveNote(text) {
  try {
    const noteId = 'note_' + Date.now();
    const timestamp = new Date().toISOString();
    
    const note = {
      id: noteId,
      timestamp: timestamp,
      text: text
    };

    // Get existing notes
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];
    
    // Add new note
    notes.push(note);
    
    // Save back to storage
    await chrome.storage.local.set({ notes: notes });
    
    console.log('Note saved:', note);
  } catch (error) {
    console.error('Error saving note:', error);
  }
}

// Toggle recording function
async function toggleRecording() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }

    // Inject the speech recognition script into the active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: injectSpeechRecognition,
      args: [isRecording]
    });

    isRecording = !isRecording;
  } catch (error) {
    console.error('Error toggling recording:', error);
  }
}

// Function to be injected into the page
function injectSpeechRecognition(wasRecording) {
  // Check if speech recognition is supported
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Speech recognition not supported');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // Initialize or get existing recognition instance
  if (!window.voiceNotesRecognition) {
    window.voiceNotesRecognition = new SpeechRecognition();
    window.voiceNotesRecognition.continuous = true;
    window.voiceNotesRecognition.interimResults = true;
    window.voiceNotesRecognition.lang = 'en-US';
    window.voiceNotesCurrentTranscript = '';

    window.voiceNotesRecognition.onstart = function() {
      console.log('Speech recognition started');
    };

    window.voiceNotesRecognition.onresult = function(event) {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      window.voiceNotesCurrentTranscript += finalTranscript;
    };

    window.voiceNotesRecognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
    };

    window.voiceNotesRecognition.onend = function() {
      console.log('Speech recognition ended');
      
      // Save the note if there's any transcript
      if (window.voiceNotesCurrentTranscript && window.voiceNotesCurrentTranscript.trim()) {
        // Send message to background script to save the note
        chrome.runtime.sendMessage({
          action: 'saveNote',
          text: window.voiceNotesCurrentTranscript.trim()
        });
        window.voiceNotesCurrentTranscript = '';
      }
    };
  }

  if (wasRecording) {
    // Stop recording
    window.voiceNotesRecognition.stop();
  } else {
    // Start recording
    window.voiceNotesCurrentTranscript = '';
    window.voiceNotesRecognition.start();
  }
}

// Listen for messages from injected script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveNote') {
    saveNote(request.text);
    sendResponse({ success: true });
  }
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-recording') {
    toggleRecording();
  }
});

// Handle extension icon click (optional - for debugging)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});
