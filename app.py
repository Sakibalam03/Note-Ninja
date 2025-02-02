from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from whisper_transcriber import WhisperTranscriber
from summarizer import summarize_file
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app with static folder configuration
app = Flask(__name__, static_folder='static')
logger.info("Flask app initialized")

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a', 'ogg', 'webm'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/index.html')
def index_html():
    return app.send_static_file('index.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('static/js', path)

@app.route('/upload', methods=['POST'])
def upload_file():
    logger.info("Upload endpoint called")
    if 'file' not in request.files:
        logger.error("No file in request")
        return jsonify({'status': 'error', 'message': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("No filename")
        return jsonify({'status': 'error', 'message': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Create a timestamp for unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"audio_{timestamp}_{secure_filename(file.filename)}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            logger.info(f"Saving file to {filepath}")
            file.save(filepath)
            
            # Initialize transcriber and process the file
            logger.info("Initializing WhisperTranscriber")
            transcriber = WhisperTranscriber()
            
            logger.info("Starting transcription")
            success, message = transcriber.transcribe_audio(filepath)
            
            if success:
                # Get the path of the generated transcript
                logger.info("Transcription successful")
                transcript_path = message.split("saved to ")[-1]
                
                # Read the transcript
                with open(transcript_path, 'r', encoding='utf-8') as f:
                    transcript_text = f.read()
                
                return jsonify({
                    'status': 'success',
                    'transcript': transcript_text
                })
            else:
                logger.error(f"Transcription failed: {message}")
                return jsonify({
                    'status': 'error',
                    'message': f'Transcription failed: {message}'
                }), 500
                
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}", exc_info=True)
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    logger.error("Invalid file type")
    return jsonify({
        'status': 'error',
        'message': 'Invalid file type'
    }), 400

@app.route('/summarize', methods=['POST'])
def summarize_text():
    logger.info("Summarize endpoint called")
    try:
        data = request.json
        text = data.get('text', '')
        
        # Save the text to a temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_input = f"temp_{timestamp}.txt"
        temp_output = f"summary_{timestamp}.txt"
        
        with open(temp_input, 'w', encoding='utf-8') as f:
            f.write(text)
        
        logger.info("Calling summarize_file")
        success, summary = summarize_file(temp_input, temp_output)
        
        # Clean up temporary input file
        os.remove(temp_input)
        
        if success:
            logger.info("Summary generated successfully")
            return jsonify({
                'status': 'success',
                'summary': summary
            })
        else:
            logger.error(f"Summarization failed: {summary}")
            return jsonify({
                'status': 'error',
                'message': summary
            }), 500
            
    except Exception as e:
        logger.error(f"Error in summarize_text: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/test')
def test():
    logger.info("Test route called")
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    try:
        # Create required directories
        os.makedirs('static/js', exist_ok=True)
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        logger.info(f"Upload folder verified: {UPLOAD_FOLDER}")
        
        app.run(debug=True)
    except Exception as e:
        logger.error(f"Error starting application: {str(e)}", exc_info=True)