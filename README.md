Note Ninja - AI Meeting Assistant 🎤

Note Ninja is a modern web application that provides real-time speech-to-text transcription and AI-powered summarization for meetings, lectures, and voice notes. With its sleek interface and powerful features, Note Ninja makes it easy to capture and process spoken content.

 

🌟 Features

- Real-time voice recording with visual feedback
- Audio file upload support (drag & drop enabled)
- Speech-to-text transcription using Whisper AI
- AI-powered text summarization
- Downloadable transcripts and summaries
- Responsive design for all devices
- Modern, intuitive user interface

 

🛠 Technologies Used

- HTML5
- CSS3 (Custom properties, Flexbox, Grid)
- JavaScript (ES6+)
- Web Speech API
- Fetch API
- Open AI Whisper
- bart-large-cnn

📋 Prerequisites

Before running this project, make sure you have:

- A modern web browser with JavaScript enabled
- Python 3.7 or higher (for the backend server)

🚀 Installation

1. Clone the repository:
bash
git clone https://github.com/yourusername/note-ninja.git
cd note-ninja


2. Install the required Python dependencies:
bash
pip install -r requirements.txt


3. Set up your environment variables:
bash
cp .env.example .env
Edit .env with your configuration


4. Start the development server:
bash
python app.py


The application will be available at http://localhost:5000

⚙ Configuration

Create a .env file in the root directory with the following variables:

env
FLASK_APP=app.py
FLASK_ENV=development
OPENAI_API_KEY=your_openai_api_key


📁 Project Structure


note-ninja/
├── static/
│   ├── js/
│   │   └── main.js
│   └── index.html
│       └── style.css
├── summaries
├── transcripts
├── uploads
├── app.py
├── summerizer.py
├── summerizerv1.py
├── whisper_transcriber.py
├── requirements.txt
└── README.md



📝 Dependencies

Backend Dependencies

flask==2.0.1
python-dotenv==0.19.0
openai-whisper==20231117
transformers==4.34.0
torch==2.1.0
tf-keras


Frontend Dependencies
- No external dependencies required
- Uses native browser APIs:
  - MediaRecorder
  - Fetch API

🔐 Security Considerations

- Implement proper CORS policies
- Set up rate limiting for API endpoints
- Validate file types and sizes
- Keep dependencies updated

🌐 Browser Support

- Chrome (latest)


🙏 Acknowledgments

- OpenAI for Whisper API
- All contributors who have helped shape Note Ninja
⚠ Known Issues

- Audio recording may not work in some browsers due to microphone permission issues
- Large audio files may take longer to process
