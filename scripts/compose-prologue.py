"""Render the 12.8-second cyber-disaster film: music and independent SFX stems.

No synthesis or model download is required on the player's device.
"""
from pathlib import Path
import json, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/music'
SR=32000
DURATION=12.8
N=round(SR*DURATION)
rng=np.random.default_rng(861015)
score=np.zeros((N,2),np.float64)
effects=np.zeros_like(score)

def hz(note): return 440*2**((note-69)/12)
def low(x,f): return sosfilt(butter(2,f,fs=SR,output='sos'),x)
def envelope(n,attack=.01,release=.1):
 t=np.arange(n)/SR
 return np.minimum(1,t/max(.0001,attack))*np.minimum(1,t[::-1]/max(.0001,release))
def add(target,at,x,gain=1,pan=0):
 if np.ndim(x)==1:x=x[:,None]*np.sqrt([(1-pan)/2,(1+pan)/2])
 start=round(at*SR);count=min(len(x),len(target)-start)
 if count>0:target[start:start+count]+=x[:count]*gain
def tone(note,length,kind='synth'):
 t=np.arange(round(length*SR))/SR;p=2*np.pi*hz(note)*t
 if kind=='sub':return (np.sin(p)+.13*np.sin(2*p))*envelope(len(t),.015,.12)
 if kind=='metal':return np.sin(p+2.1*np.exp(-t*8)*np.sin(p*1.997))*np.exp(-t*4)*envelope(len(t),.002,.07)
 sides=[]
 for detune in [-.0018,.0018]:
  phase=p*(1+detune)
  x=sum(np.sin(phase*k)*(.8/k**1.3) for k in range(1,8))
  sides.append(low(np.tanh(x*1.4),5400 if kind=='bright' else 1500)*envelope(len(t),.006 if kind=='bright' else .09,.2))
 return np.column_stack(sides)
def noise(length,cutoff=4000,decay=7):
 t=np.arange(round(length*SR))/SR
 x=rng.normal(0,1,len(t));x=low(x,cutoff)
 return x*np.exp(-t*decay)*envelope(len(t),.002,.06)
def impact(at,power=.3):
 t=np.arange(round(.7*SR))/SR
 bass=np.sin(2*np.pi*np.cumsum(39+130*np.exp(-t*22))/SR)*np.exp(-t*9)
 add(effects,at,bass,power)
 add(effects,at,noise(.85,4400,8),power*.35)

# A dark, urgent score with a low analog body rather than continuous shrill lead.
for note,gain in [(28,.12),(40,.08),(47,.055),(51,.035)]:
 add(score,0,tone(note,7.05,'synth'),gain,(-1 if note%2 else 1)*.22)
for i in range(16):
 at=1.2+i*.365
 add(score,at,tone([40,40,43,39][i%4],.3,'sub'),.19)
 if i%2==1:add(score,at,tone([71,70,67,63][i%4],.29,'metal'),.055,(-1)**i*.48)
 if at>2.8:
  add(score,at,noise(.1,2000,36),.08)
for at in [3,4.46,5.92]:
 for note in [52,55,59,63]:add(score,at,tone(note,1.23),.045)
# The voice close-up and black command card use a deliberate drop in density.
add(score,7.2,tone(40,1.1,'sub'),.11)
for i,note in enumerate([64,67,71]):add(score,8.4+i*.14,tone(note,.3,'metal'),.07)
add(score,9.1,tone(47,1.48,'sub'),.14)
for i in range(12):
 at=9.45+i*.08
 add(score,at,tone(64+i,.09,'metal'),.035+i*.002,(-1)**i*.38)
# The decisive bright electronic chord and fast arpeggio accompany one slash.
for note in [40,52,59,64,67,71,76]:add(score,10.6,tone(note,1.45,'bright'),.12 if note<60 else .075)
for i,note in enumerate([76,79,83,88,83,79,76,71,76,79,83,88]):
 add(score,10.65+i*.09,tone(note,.18,'metal'),.09,(-1)**i*.35)

# Star fracture, the white surface breaking, crumbling data and insect passes.
impact(.08,.34)
for at,pan in [(.16,-.7),(.28,.6),(.46,-.3),(.68,.8),(.92,0)]:
 add(effects,at,noise(.32,7200,21),.22,pan)
 for note in [86,93,98]:add(effects,at,tone(note,.20,'metal'),.055,pan)
for i in range(19):
 at=1.22+i*.077
 add(effects,at,noise(.15,4200,27),.14,np.sin(i*2)*.7)
for at in [3.12,4.8,6.35]:impact(at,.16)
for at,pan in [(3.7,-.7),(5.3,.65),(6.65,-.5)]:
 t=np.arange(round(.62*SR))/SR
 whirr=np.sin(2*np.pi*np.cumsum(100+45*np.sin(t*12))/SR)
 whirr*=np.sin(np.pi*t/.62)**2
 add(effects,at,whirr,.08,pan)
add(effects,7.2,noise(.14,5800,24),.20)
add(effects,8.4,tone(84,.09,'metal'),.19)
add(effects,8.66,tone(91,.12,'metal'),.17)
# A wide, fast cutting rush into a bass impulse; the delete particles follow it.
length=.65;t=np.arange(round(length*SR))/SR
cut=(rng.standard_normal(len(t))-low(rng.standard_normal(len(t)),1200))*np.sin(np.pi*t/length)**3
add(effects,10.35,low(cut,6400),.38,-.35)
impact(10.6,.47)
for i in range(22):
 at=10.67+i*.047
 add(effects,at,tone(91-(i%7)*3,.14,'metal'),.10,(-1)**i*.65)
add(effects,12,noise(.7,7800,5),.12)

for kind,data,target_rms,peak in [('score',score,.16,.75),('effects',effects,.115,.83)]:
 data=np.tanh(data*1.4)
 data*=min(peak/max(.0001,np.max(np.abs(data))),target_rms/max(.0001,np.sqrt(np.mean(data**2))))
 data[-round(SR*.08):]*=np.linspace(1,0,round(SR*.08))[:,None]
 wav=OUT/f'zero-prologue-{kind}-v86.wav'
 with wave.open(str(wav),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
  f.writeframes(np.asarray(np.clip(data,-.9,.9)*32767,'<i2').tobytes())
 mp3=wav.with_suffix('.mp3')
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(mp3)],check=True)
 wav.unlink()
 print(kind,mp3.stat().st_size,'rms',round(float(np.sqrt(np.mean(data**2))),4),'peak',round(float(np.max(np.abs(data))),4))
(OUT/'zero-prologue-v86.json').write_text(json.dumps({'duration':DURATION,'music':'dark electronic disaster to decisive Em9 slash','stems':['score','effects'],'voice':'existing Akari long-sword cue','cues':{'star':0,'crumble':1.15,'city':2.8,'akari':7.2,'command':8.4,'sword':10.1,'hit':10.6,'white':12,'home':12.8}},indent=2)+'\n')
