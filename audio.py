from transformers import AutoFeatureExtractor, WhisperForAudioClassification
import torch
import librosa



device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
# device = 'cpu'
print('Run on:', device)

SAMPLEING_RATE = 16000
MAX_LENGTH = SAMPLEING_RATE * 10 # 10 seconds 


fluency_model_name = "seba3y/whisper-tiny-fluency" #future use
acc_model_name = 'seba3y/whisper-tiny-accuracy'

fluency_feature = AutoFeatureExtractor.from_pretrained(fluency_model_name)
fluency_model = WhisperForAudioClassification.from_pretrained(fluency_model_name).to(device)
acc_feature = AutoFeatureExtractor.from_pretrained(acc_model_name)
acc_model = WhisperForAudioClassification.from_pretrained(acc_model_name).to(device)


def load_audio_from_path(file_path, feature_extractor, max_length=MAX_LENGTH):
    audio, _ = librosa.load(file_path, sr=SAMPLEING_RATE)
    audio_length = len(audio)
    
    # Splitting the audio if it's longer than max_length
    segments = []
    for start in range(0, audio_length, max_length):
        end = min(start + max_length, audio_length)
        segment = audio[start:end]
        inputs = feature_extractor(segment, sampling_rate=SAMPLEING_RATE, return_tensors="pt", max_length=max_length, padding="max_length", ).input_features
        segments.append(inputs)
    
    return segments


@torch.no_grad()
def model_generate(inputs, model):
    logits = model(inputs.to(device))[0]
    return logits
    
def postprocess(logits, model, top_k=1):
    scores = logits[0].softmax(-1).cpu()
    ids = torch.argmax(scores, dim=-1).item()
    scores = scores.tolist()
    labels = model.config.id2label[ids]
    return labels, round(scores[ids], 2)

def predict(segments, model):
    
    all_logits = []
    
    for segment in segments:
        logits = model_generate(segment, model)
        all_logits.append(logits)

    # Aggregating the results (simple average)
    avg_logits = torch.mean(torch.stack(all_logits), dim=0)
    return postprocess(avg_logits, model)

def prdict_accuracy(file_path):
    result = predict(file_path, acc_model)
    return result

def predict_fluency(file_path):
    result = predict(file_path, fluency_model)
    return result

def predict_all(file_path):
    segments = load_audio_from_path(file_path, acc_feature)
    acc = predict(segments, acc_model)
    fle = predict(segments, fluency_model)
    return acc, fle
        
if __name__ == '__main__':
    file_path = r'uploads\audio.wav'
    print('start')
    result = predict_fluency(file_path)
    print('done')
    # print('Fluency of the speech:')
    # print("="*25)
    # print(result)
    # # for key, value in result.items():
    # #     print('Prediction:', key, "\nConfidinse:", round(value, 2) * 100, '%')
    # # print() 
    # # print("="*25) 
    # # print()
    # print('Pronunciation Accuracy of the speech:')
    # print("="*25)  
    # result = prdict_accuracy(file_path)
    # print(result)
    # for key, value in result.items():
    #     print('Prediction:', key, "\nConfidinse:", round(value, 2) * 100, '%')
    # print()
    # print('='*25)