import os
from transformers import pipeline

_summarizer = None

def get_summarizer():
    global _summarizer
    if _summarizer is None:
        _summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    return _summarizer

def summarize_file(input_file, output_file=None, summarizer=None):
    """Summarize a single file using the provided summarizer pipeline."""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            article_text = f.read()

        if not article_text.strip():
            return False, "No text provided for summarization"

        summarizer = summarizer or get_summarizer()
        
        summary = summarizer(article_text, max_length=130, min_length=30, do_sample=False)
        summary_text = summary[0]['summary_text']

        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(summary_text)

        return True, summary_text
        
    except Exception as e:
        return False, f"Error processing {input_file}: {str(e)}"

def process_directory(input_dir="transcripts", output_dir="summaries"):
    """Process all text files in the input directory and save summaries."""
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        summarizer = get_summarizer()
    except Exception as e:
        print(f"Error initializing summarizer: {str(e)}")
        return
    
    # Get all text files in the directory
    text_files = [f for f in os.listdir(input_dir) if f.endswith('.txt')]
    
    if not text_files:
        print(f"No text files found in {input_dir}")
        return
    
    # Process each file
    for filename in text_files:
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, f"summary_{filename}")
        
        print(f"\nProcessing: {filename}")
        success, result = summarize_file(input_path, summarizer)
        
        if success:
            # Save the summary
            try:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(result)
                print(f"✓ Summary saved to: {output_path}")
                print("Summary:")
                print(result)
            except Exception as e:
                print(f"Error saving summary for {filename}: {str(e)}")
        else:
            print(result)  # Print error message

if __name__ == "__main__":
    process_directory()
