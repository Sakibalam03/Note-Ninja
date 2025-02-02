from transformers import pipeline
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import soundfile as sf
import os
from datetime import datetime

class WhisperTranscriber:
    def __init__(self, model_id="openai/whisper-large-v3-turbo"):
        # Setup device and dtype
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        # Initialize model
        print(f"Loading model on {self.device}...")
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id,
            torch_dtype=self.torch_dtype,
            use_safetensors=True
        )
        self.model.to(self.device)
        
        # Initialize processor and pipeline
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=self.model,
            tokenizer=self.processor.tokenizer,
            feature_extractor=self.processor.feature_extractor,
            torch_dtype=self.torch_dtype,
            device=self.device,
        )

    def transcribe_audio(self, audio_path, output_dir="transcripts"):
        """
        Transcribe an audio file and save the result to a text file.
        
        Args:
            audio_path (str): Path to the audio file
            output_dir (str): Directory to save the transcript
        
        Returns:
            tuple: (success (bool), message (str))
        """
        try:
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            # Generate output filename
            base_name = os.path.splitext(os.path.basename(audio_path))[0]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = os.path.join(output_dir, f"{base_name}_{timestamp}.txt")
            
            # Load and transcribe audio
            print(f"Transcribing {audio_path}...")
            result = self.pipe(audio_path)
            
            # Save transcription
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(result["text"])
            
            return True, f"Transcription saved to {output_path}"
            
        except Exception as e:
            return False, f"Error: {str(e)}"

    def transcribe_directory(self, input_dir, output_dir="transcripts"):
        """
        Transcribe all audio files in a directory.
        
        Args:
            input_dir (str): Directory containing audio files
            output_dir (str): Directory to save transcripts
        """
        supported_formats = {'.wav', '.mp3', '.flac', '.m4a', '.ogg'}
        results = []
        
        for filename in os.listdir(input_dir):
            if os.path.splitext(filename)[1].lower() in supported_formats:
                audio_path = os.path.join(input_dir, filename)
                success, message = self.transcribe_audio(audio_path, output_dir)
                results.append((filename, success, message))
        
        return results

def main():
    transcriber = WhisperTranscriber()
    audio_path = "./transcripts" 
    input_dir = "./uploads"  # Replace with your directory path
    if os.path.exists(input_dir):
        results = transcriber.transcribe_directory(input_dir)
        for filename, success, message in results:
            print(f"{filename}: {message}")

if __name__ == "__main__":
    main()