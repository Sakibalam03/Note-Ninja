let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let pollTimer;
let latestText = '';

const POLL_INTERVAL_MS = 2000;
const DEFAULT_MESSAGE = 'Your transcript will appear here after processing...';

const recordButton = document.getElementById('recordButton');
const audioFileInput = document.getElementById('audioFileInput');
const summaryContent = document.getElementById('summaryContent');
const statusIndicator = document.querySelector('.status-indicator');
const statusSpinner = document.getElementById('statusSpinner');
const saveButton = document.getElementById('saveButton');
const summarizeButton = document.getElementById('summarizeButton');
const uploadSection = document.querySelector('.upload-section');

function setBusy(isBusy, statusText) {
    statusIndicator.textContent = statusText;
    statusSpinner.classList.toggle('visible', isBusy);
    if (audioFileInput) {
        audioFileInput.disabled = isBusy;
    }
    if (summarizeButton) {
        summarizeButton.disabled = isBusy || !latestText;
    }
    if (saveButton) {
        saveButton.disabled = isBusy || !latestText;
    }
}

function resetOutput(message = DEFAULT_MESSAGE) {
    latestText = '';
    summaryContent.textContent = message;
    setBusy(false, 'Ready');
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
    }
}

function showTranscript(transcript) {
    latestText = transcript || '';
    summaryContent.textContent = latestText || 'No transcript was returned.';
    setBusy(false, 'Transcription complete');
}

function showError(message) {
    stopPolling();
    latestText = '';
    summaryContent.textContent = message || 'Error processing audio. Please try again.';
    setBusy(false, 'Error');
}

async function pollJobStatus(jobId) {
    try {
        const response = await fetch(`/status/${encodeURIComponent(jobId)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error_message || data.message || 'Unable to read transcription status');
        }

        if (data.status === 'pending') {
            setBusy(true, 'Transcribing...');
            summaryContent.textContent = 'Transcription is still running. You can keep this page open while it finishes.';
            return;
        }

        stopPolling();

        if (data.status === 'done') {
            showTranscript(data.transcript);
            return;
        }

        if (data.status === 'error') {
            throw new Error(data.error_message || 'Transcription failed');
        }

        throw new Error(`Unexpected job status: ${data.status}`);
    } catch (error) {
        console.error('Polling error:', error);
        showError(error.message);
    }
}

function startPolling(jobId) {
    stopPolling();
    pollJobStatus(jobId);
    pollTimer = setInterval(() => pollJobStatus(jobId), POLL_INTERVAL_MS);
}

async function submitAudio(formData) {
    try {
        stopPolling();
        latestText = '';
        setBusy(true, 'Uploading...');
        summaryContent.textContent = 'Uploading audio...';

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error_message || 'Failed to upload audio');
        }

        if (data.job_id) {
            setBusy(true, 'Queued');
            summaryContent.textContent = 'Audio uploaded. Waiting for transcription to start...';
            startPolling(data.job_id);
            return;
        }

        if (data.status === 'success') {
            showTranscript(data.transcript);
            return;
        }

        throw new Error(data.message || 'Upload did not return a job id');
    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message);
    }
}

async function initializeRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioChunks = [];

            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.wav');
            await submitAudio(formData);
        };
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Error accessing microphone. Please ensure microphone permissions are granted.');
    }
}

if (recordButton) {
    recordButton.addEventListener('click', async () => {
        if (!mediaRecorder) {
            await initializeRecording();
        }

        if (!mediaRecorder) {
            return;
        }

        try {
            if (!isRecording) {
                audioChunks = [];
                mediaRecorder.start(1000);
                isRecording = true;
                recordButton.classList.add('recording');
                setBusy(true, 'Recording...');
                summaryContent.textContent = 'Recording audio...';
            } else {
                mediaRecorder.stop();
                isRecording = false;
                recordButton.classList.remove('recording');
                setBusy(true, 'Preparing audio...');
            }
        } catch (error) {
            console.error('Recording error:', error);
            alert('Error recording audio. Please try again.');
            setBusy(false, 'Ready');
        }
    });
}

if (audioFileInput) {
    audioFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        await submitAudio(formData);
        audioFileInput.value = '';
    });
}

if (uploadSection) {
    uploadSection.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadSection.classList.add('drag-over');
    });

    uploadSection.addEventListener('dragleave', (event) => {
        event.preventDefault();
        uploadSection.classList.remove('drag-over');
    });

    uploadSection.addEventListener('drop', async (event) => {
        event.preventDefault();
        uploadSection.classList.remove('drag-over');

        const file = event.dataTransfer.files[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        await submitAudio(formData);
    });
}

if (summarizeButton) {
    summarizeButton.addEventListener('click', async () => {
        if (!latestText) {
            return;
        }

        try {
            setBusy(true, 'Summarizing...');
            summaryContent.textContent = 'Generating summary...';

            const response = await fetch('/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: latestText })
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'success') {
                throw new Error(data.message || 'Failed to summarize transcript');
            }

            latestText = data.summary;
            summaryContent.textContent = data.summary;
            setBusy(false, 'Summary complete');
        } catch (error) {
            console.error('Summarization error:', error);
            summaryContent.textContent = error.message || 'Error generating summary. Please try again.';
            setBusy(false, 'Error');
        }
    });
}

if (saveButton) {
    saveButton.addEventListener('click', () => {
        const text = summaryContent.textContent;
        if (!text || text === DEFAULT_MESSAGE) {
            alert('No text to save');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `note_ninja_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    resetOutput();
    initializeRecording();
});
