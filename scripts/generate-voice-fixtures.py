"""Development only: OpenJTalk command audio, not recordings of a user's microphone."""
import json,pathlib,subprocess,tempfile,wave
import numpy as np
import pyopenjtalk
root=pathlib.Path(__file__).resolve().parents[1]/'tests/fixtures/voice'
texts={
'sword':'ファイル、ソード、ナンバー、一、エンター',
'guns':'ファイル、ガンズ、ナンバー、二、エンター',
'shield':'ファイル、シールド、ナンバー、三、エンター',
'wing':'ファイル、ウィング、ナンバー、ゼロ、ゼロ、スリー、エンター',
'gravity':'ファイル、グラビティ、ナンバー、ゼロゼロ二、エンター',
'area':'ファイル、エリア、ナンバー、四、エンター',
'target':'ターゲット、ナンバー、ツー、エンター',
'reset':'リセット','enter':'エンター','down':'降りて、エンター','auto':'オートモード、エンター',
'multiple':'ファイル、ソード、ナンバー、二、次に、ファイル、ガンズ、ナンバー、三、それから、ファイル、ソード、ナンバー、一、三回使って、エンター',
'mixed-digits':'ファイル、ガンズ、ナンバー、ゼロゼロツー、エンター'}
root.mkdir(parents=True,exist_ok=True)
for name,text in texts.items():
 x,rate=pyopenjtalk.tts(text)
 with tempfile.NamedTemporaryFile(suffix='.wav') as f:
  with wave.open(f.name,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.asarray(np.clip(x,-32768,32767),dtype='<i2').tobytes())
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',f.name,'-ar','16000',str(root/(name+'.flac'))],check=True)
 print(name,text,flush=True)
(root/'reference.json').write_text(json.dumps({'source':'pyopenjtalk 0.4.1, default HTS voice','synthetic':True,'sampleRate':16000,'texts':texts},ensure_ascii=False,indent=2))
