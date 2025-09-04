// Popup script for Voice Notes Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  loadNotes();
  
  // Add event listener for clear button
  document.getElementById('clear-notes').addEventListener('click', clearAllNotes);
});

// Load and display notes from storage
async function loadNotes() {
  try {
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];
    
    const container = document.getElementById('notes-container');
    
    if (notes.length === 0) {
      container.innerHTML = '<div class="no-notes">No notes yet. Use Option+Shift+V (Mac) or Alt+Shift+V (Windows/Linux) to start recording!</div>';
      return;
    }
    
    // Sort notes by timestamp (newest first)
    notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Render notes
    container.innerHTML = notes.map(note => `
      <div class="note">
        <div class="note-timestamp">${formatTimestamp(note.timestamp)}</div>
        <div class="note-text">${escapeHtml(note.text)}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading notes:', error);
    document.getElementById('notes-container').innerHTML = '<div class="no-notes">Error loading notes</div>';
  }
}

// Format timestamp for display
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Clear all notes
async function clearAllNotes() {
  if (confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
    try {
      await chrome.storage.local.remove(['notes']);
      loadNotes(); // Reload to show empty state
    } catch (error) {
      console.error('Error clearing notes:', error);
      alert('Error clearing notes');
    }
  }
}
