let mediaRecorder;
let audioChunks = [];
let uploadedFile = null;  // Variable to store the uploaded file

document.getElementById('startRecordButton').addEventListener('click', startRecording);
document.getElementById('stopRecordButton').addEventListener('click', stopRecording);
document.getElementById('sendButton').addEventListener('click', sendData);
document.getElementById('fileInput').addEventListener('change', handleFileInput);


function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            mediaRecorder.start();
            toggleButtons(true);
            uploadedFile = null;  // Reset the uploaded file
        })
        .catch(e => console.error('Error accessing media devices:', e));
}

function stopRecording() {
    mediaRecorder.stop();
    toggleButtons(false);
    mediaRecorder.addEventListener('stop', () => {
        const audioUrl = URL.createObjectURL(new Blob(audioChunks, { type: 'audio/wav' }));
        document.getElementById('audioPlayback').src = audioUrl;
        document.getElementById('audioPlaybackContainer').style.display = 'block';
        uploadedFile = null;  // Reset the uploaded file
    });
}

function handleFileInput(event) {
    uploadedFile = event.target.files[0];
    if (uploadedFile) {
        const audioUrl = URL.createObjectURL(uploadedFile);
        document.getElementById('audioPlayback').src = audioUrl;
        document.getElementById('audioPlaybackContainer').style.display = 'block';
        document.getElementById('sendButton').disabled = false;
        audioChunks = [];  // Reset the recorded audio
    }
}


function sendData() {
    const audioData = uploadedFile ? uploadedFile : new Blob(audioChunks, { type: 'audio/wav' });
    sendDataToAPI(audioData);
}

function sendDataToAPI(audioData) {
    console.log("Sending data to API:", audioData);
    const apiUrl = 'http://127.0.0.1:5000/upload-audio'; // Replace with your API endpoint
    const formData = new FormData();
    formData.append('audio', audioData, audioData.name || 'audio.wav');

    showLoadingIndicator(true);
    fetch(apiUrl, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log("Received response from API");
        return response.json();
    })
    .then(data => {
        showLoadingIndicator(false);
        updateResults(data);
    })
    .catch(error => {
        console.error('Error:', error);
        showLoadingIndicator(false);
    });
}
function showLoadingIndicator(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

function toggleButtons(isRecording) {
    document.getElementById('startRecordButton').disabled = isRecording;
    document.getElementById('stopRecordButton').disabled = !isRecording;
    document.getElementById('sendButton').disabled = isRecording && !uploadedFile; // Enable if a file is uploaded
}

// ... existing functions ...

function updateResults(data) {
    // Extract message and score level for Accuracy
    const accuracyData = data.Accuracy;
    const accuracyScoreRange = extractScoreLevel(accuracyData[0]);
    const accuracyMessage = extractMessage(accuracyData[0]);
    document.getElementById('accuracyMessage').innerHTML = `<strong>Message:</strong> ${accuracyMessage}`;
    document.getElementById('accuracyScore').innerHTML = `<strong>Score Level:</strong> ${accuracyScoreRange}`;

    // Calculate, update, and animate Accuracy Confidence Bar
    updateConfidenceBar('accuracy', accuracyData[1]);

    // Extract message and score level for Fluency
    const fluencyData = data.Fluency;
    const fluencyScoreRange = extractScoreLevel(fluencyData[0]);
    const fluencyMessage = extractMessage(fluencyData[0]);
    document.getElementById('fluencyMessage').innerHTML = `<strong>Message:</strong> ${fluencyMessage}`;
    document.getElementById('fluencyScore').innerHTML = `<strong>Score Level:</strong> ${fluencyScoreRange}`;

    // Calculate, update, and animate Fluency Confidence Bar
    updateConfidenceBar('fluency', fluencyData[1]);

    // Show result container
    document.getElementById('resultContainer').style.display = 'block';
}

function extractScoreLevel(message) {
    const scoreMatch = message.match(/Score: (\d+)-(\d+)/);
    return scoreMatch ? `${scoreMatch[1]} of 10` : "Not available";
}

function extractMessage(message) {
    return message.split(',').slice(1).join(',').trim();
}

function updateConfidenceBar(type, confidenceScore) {
    const confidencePercent = (confidenceScore * 100).toFixed(0);
    const barElement = document.getElementById(`${type}ConfidenceFill`);
    barElement.textContent = `${confidencePercent}%`;
    barElement.style.width = `${confidencePercent}%`;
    
    // Remove existing classes
    barElement.classList.remove('high-confidence', 'medium-confidence', 'low-confidence');

    // Set class based on confidence level
    if (confidencePercent >= 75) {
        barElement.classList.add('high-confidence');
    } else if (confidencePercent >= 50) {
        barElement.classList.add('medium-confidence');
    } else {
        barElement.classList.add('low-confidence');
    }
}


function updateResultBar(elementId, label, resultData) {
    const score = resultData[1] * 100; // Convert to percentage
    const scoreColor = getScoreColor(score); // Function to determine color based on score

    document.getElementById(elementId).innerHTML = `
        <div class="result-bar-fill" style="width: ${score}%; background-color: ${scoreColor};"></div>
        <div class="result-text">${label}: ${resultData[0]} (${score.toFixed(0)} / 100)</div>
    `;
}

function getScoreColor(score) {
    if (score > 75) return '#4CAF50'; // Green for high scores
    if (score > 50) return '#FFC107'; // Yellow for medium scores
    return '#F44336'; // Red for low scores
}
