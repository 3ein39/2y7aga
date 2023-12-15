from flask import Flask, request, jsonify, render_template
import os
from audio import predict_all
from flask_cors import CORS



app = Flask(__name__)
CORS(app)
@app.route('/')
def index():
    return render_template('index.html') 

@app.route('/upload-audio', methods=['POST'])
def upload_audio():
    if 'audio' not in request.files:
        return "No audio part", 400

    file = request.files['audio']
    if file.filename == '':
        return "No selected file", 400

    if file:
        # You can add file saving logic here
        filename = f'uploads/{file.filename}'
        file.save(filename)
        
        # Convert the NumPy array to a list
        # Mock processing and response
        accuracy, fluency = predict_all(filename)
        # Replace this with your actual processing logic
        response = {
            "Accuracy": [accuracy[0], accuracy[1]],
            "Fluency": [fluency[0], fluency[1]]
        }
        return jsonify(response), 200

    return "Error processing request", 400

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)  # Create a directory for uploads
    app.run(debug=False)
