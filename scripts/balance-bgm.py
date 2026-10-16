"""Match battle loudness to the existing home score without changing the music.

Render once during development; the browser keeps a fixed shared BGM gain.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parents[1]
MUSIC=ROOT/'dist/assets/music'
REFERENCE='zero-home-opening-v2.mp3'
TRACKS=[('zero-debug-battle-v17.mp3','zero-debug-battle-v89.mp3',-7.8,'256k'),
        ('zero-error-horror.mp3','zero-error-horror-v89.mp3',-3.3,'192k')]

def measure(name):
    result=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(MUSIC/name),
        '-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True,check=True)
    text=result.stderr
    tail=text[text.rfind('Summary:'):]
    points=[(float(t),float(m),float(s)) for t,m,s in re.findall(
        r't:\s*([\d.]+).*?M:\s*(-?[\d.]+).*?S:\s*(-?[\d.]+)',text)]
    return {'file':name,'integrated_lufs':float(re.search(r'I:\s*(-?[\d.]+) LUFS',tail)[1]),
        'range_lu':float(re.search(r'LRA:\s*(-?[\d.]+) LU',tail)[1]),
        'true_peak_dbfs':float(re.search(r'Peak:\s*(-?[\d.]+) dBFS',tail)[1]),
        'max_short_lufs':max(s for t,m,s in points if t>=3),
        'max_momentary_lufs':max(m for t,m,s in points if t>=.4),
        'climax_10_to_20s_lufs':max(s for t,m,s in points if 10<=t<=20)}

def render(spec):
    original,output,gain,bitrate=spec
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(MUSIC/original),
        '-vn','-af',f'volume={gain}dB','-codec:a','libmp3lame','-b:a',bitrate,str(MUSIC/output)],check=True)
    return output

if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=3) as pool:
        before=list(pool.map(measure,[REFERENCE]+[s[0] for s in TRACKS]))
    with ThreadPoolExecutor(max_workers=2) as pool:
        outputs=list(pool.map(render,TRACKS))
    with ThreadPoolExecutor(max_workers=2) as pool:
        after=list(pool.map(measure,outputs))
    reference=before[0]
    for track in after:
        assert track['max_short_lufs']<=reference['max_short_lufs']+.3,track
        assert track['max_momentary_lufs']<=reference['max_momentary_lufs']+.3,track
        assert abs(track['integrated_lufs']-reference['integrated_lufs'])<1.6,track
        assert track['true_peak_dbfs']<-2,track
    report={'revision':89,'method':'fixed offline attenuation; no runtime gain changes',
        'reference':reference,'before':before[1:],'after':after,
        'gain_db':{output:gain for original,output,gain,bitrate in TRACKS}}
    (ROOT/'docs/audio-mix-v89.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
