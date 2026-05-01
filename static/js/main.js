// Global variables
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// DOM Elements
const recordButton = document.getElementById('recordButton');
const audioFileInput = document.getElementById('audioFileInput');
const summaryContent = document.getElementById('summaryContent');
const statusIndicator = document.querySelector('.status-indicator');
const saveButton = document.getElementById('saveButton');

// Initialize recording capabilities
async function initializeRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            await handleRecordedAudio(audioBlob);
            audioChunks = [];
        };

    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Error accessing microphone. Please ensure microphone permissions are granted.');
    }
}

// Handle the recorded audio
async function handleRecordedAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');

    try {
        statusIndicator.textContent = 'Processing...';
        summaryContent.textContent = 'Transcribing...';

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status === 'success') {
            summaryContent.textContent = data.transcript;
            if (saveButton) {
                saveButton.style.display = 'flex';
            }
            statusIndicator.textContent = 'Transcription complete';
        } else {
            throw new Error(data.message || 'Failed to process audio');
        }
    } catch (error) {
        console.error('Error:', error);
        statusIndicator.textContent = 'Error processing audio';
        summaryContent.textContent = 'Error processing audio. Please try again.';
    }
}

// Handle audio recording button click
if (recordButton) {
    recordButton.addEventListener('click', async () => {
        if (!mediaRecorder) {
            await initializeRecording();
        }
        
        if (!isRecording) {
            try {
                // Start recording
                audioChunks = []; // Clear previous chunks
                mediaRecorder.start(1000); // Collect data every second
                isRecording = true;
                recordButton.classList.add('recording');
            } catch (error) {
                console.error('Error starting recording:', error);
                alert('Error starting recording. Please try again.');
            }
        } else {
            try {
                // Stop recording
                mediaRecorder.stop();
                isRecording = false;
                recordButton.classList.remove('recording');
            } catch (error) {
                console.error('Error stopping recording:', error);
                alert('Error stopping recording. Please try again.');
            }
        }
    });
}

// Handle file upload
if (audioFileInput) {
    audioFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            statusIndicator.textContent = 'Processing...';
            summaryContent.textContent = 'Transcribing...';

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                summaryContent.textContent = data.transcript;
                if (saveButton) {
                    saveButton.style.display = 'flex';
                }
                statusIndicator.textContent = 'Transcription complete';
            } else {
                throw new Error(data.message || 'Failed to process audio');
            }
        } catch (error) {
            console.error('Error:', error);
            statusIndicator.textContent = 'Error processing file';
            summaryContent.textContent = 'Error processing audio file. Please try again.';
        }
    });
}

// Handle drag and drop
const uploadSection = document.querySelector('.upload-section');
if (uploadSection) {
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('drag-over');
    });

    uploadSection.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('drag-over');
    });

    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            
            if (!file.type.startsWith('audio/')) {
                alert('Please select an audio file.');
                return;
            }
            
            // Trigger the file input change event
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            audioFileInput.files = dataTransfer.files;
            audioFileInput.dispatchEvent(new Event('change'));
        }
    });
}

// Save functionality
if (saveButton) {
    saveButton.addEventListener('click', () => {
        const text = summaryContent.textContent;
        if (!text || text === 'Your text summary will appear here after processing...') {
            alert('No text to save');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Initialize recording capabilities when page loads
document.addEventListener('DOMContentLoaded', initializeRecording);