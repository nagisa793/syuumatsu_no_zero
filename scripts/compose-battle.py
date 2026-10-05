"""Original 172 BPM electronic battle score: 32 bars / 48 seconds.

Four musical stems: lead, harmony/arpeggio, bass and drums. All sounds are
synthesized here; there are no samples or melodies from an existing work.
Writes a temporary stereo WAV for MP3 mastering with ffmpeg.
"""
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

SR=44100
BPM=172
BEAT=60/BPM
BARS=32
N=round(BARS*4*BEAT*SR)
rng=np.random.default_rng(703)
stems={k:np.zeros((N,2),np.float32) for k in ['lead','harmony','bass','drums']}
hz=lambda n:440*2**((n-69)/12)

def env(n,attack=.005,release=.05):
    e=np.ones(n)
    a=min(n,round(attack*SR));r=min(n-a,round(release*SR))
    if a:e[:a]=np.linspace(0,1,a)
    if r:e[-r:]=np.linspace(1,0,r)**1.6
    return e

def filt(x,cut,kind='lowpass'):
    return sosfilt(butter(2,cut,fs=SR,btype=kind,output='sos'),x,axis=0)

def add(stem,beat,x,gain=1,pan=0):
    start=round(beat*BEAT*SR)
    if x.ndim==1:x=np.column_stack([x*np.sqrt((1-pan)/2),x*np.sqrt((1+pan)/2)])
    end=min(N,start+len(x));count=end-start
    if count>0:stems[stem][start:end]+=x[:count]*gain
    # Wrap release tails to the beginning of the loop.
    if count<len(x):stems[stem][:len(x)-count]+=x[count:]*gain

def synth(note,duration,kind='lead',bright=1):
    n=round((duration*BEAT+.095)*SR);t=np.arange(n)/SR;f=hz(note)
    if kind=='bass':
        phase=2*np.pi*f*t
        x=np.sin(phase)*.7
        for k in range(1,10):x+=np.sin(phase*k)*.23/k
        x=filt(np.tanh(x*2.6),2300)
        return x*env(n,.002,.075)*np.exp(-t*.9)
    out=[]
    for side in [-1,1]:
        phase=2*np.pi*f*(t*2**(side*6/1200)+.00017*np.sin(2*np.pi*5.4*t))
        x=np.zeros(n)
        for k in range(1,min(22,int(16000/f))+1):x+=np.sin(phase*k)/k
        x+=np.sin(phase*1.004)*.24
        x=filt(x,3600*bright if kind=='lead' else 2400*bright)
        out.append(x)
    amp=env(n,.008 if kind=='lead' else .002,.09)
    amp*=.65+.35*np.exp(-t*11)
    return np.column_stack(out)*amp[:,None]*.62

def kick():
    t=np.arange(round(.29*SR))/SR
    phase=2*np.pi*(48*t+115*.022*(1-np.exp(-t/.022)))
    x=np.sin(phase)*np.exp(-t*15)+rng.normal(0,1,len(t))*.15*np.exp(-t*270)
    return np.tanh(x*2.1)*env(len(t),.001,.03)*.62

def snare(soft=False):
    t=np.arange(round(.22*SR))/SR
    noise=filt(rng.normal(0,1,len(t)),1600,'highpass')
    clap=(np.exp(-t*28)+.5*np.exp(-np.maximum(0,t-.014)*55)*(t>.014))
    x=noise*clap*.44+np.sin(2*np.pi*185*t)*np.exp(-t*35)*.42
    return np.tanh(x*1.5)*env(len(t),.001,.025)*(.3 if soft else .57)

def hat(opened=False):
    t=np.arange(round((.18 if opened else .068)*SR))/SR
    x=filt(rng.normal(0,1,len(t)),7800,'highpass')
    return x*np.exp(-t*(23 if opened else 80))*env(len(t),.0008,.018)*.2

def crash():
    t=np.arange(round(1.3*SR))/SR
    x=filt(rng.normal(0,1,len(t)),4600,'highpass')
    return x*np.exp(-t*3.6)*env(len(t),.005,.12)*.18

roots=[38,34,41,36,31,34,33,33]
chords=[[0,3,7,10],[0,4,7,11],[0,4,7,9],[0,4,7,10],[0,3,7,10],[0,4,7,11],[0,4,7,10],[0,4,7,10]]
# Deliberate eight-bar phrases, with held notes, offbeats and a dominant pickup.
melody=[
 [(0,74,.75),(.75,77,.25),(1,81,1),(2,79,.5),(2.5,77,.5),(3,76,.5),(3.5,74,.5)],
 [(0,77,1),(1,74,.5),(1.5,72,.5),(2,70,1),(3,74,.5),(3.5,77,.5)],
 [(0,81,1.5),(1.5,79,.5),(2,77,.75),(2.75,79,.25),(3,81,.75),(3.75,84,.25)],
 [(0,79,1),(1,76,.5),(1.5,74,.5),(2,72,.75),(2.75,74,.25),(3,76,.5),(3.5,72,.5)],
 [(0,79,.75),(.75,81,.25),(1,82,1),(2,81,.5),(2.5,79,.5),(3,77,1)],
 [(0,77,.5),(.5,74,.5),(1,77,.5),(1.5,81,.5),(2,82,1),(3,81,.5),(3.5,79,.5)],
 [(0,76,1),(1,73,.5),(1.5,76,.5),(2,81,1),(3,79,.5),(3.5,76,.5)],
 [(0,73,.5),(.5,76,.5),(1,81,.5),(1.5,85,.5),(2,88,.75),(2.75,85,.25),(3,81,.5),(3.5,73,.5)]
]
kick_beats=[]
for bar in range(BARS):
    base=bar*4;j=bar%8;root=roots[j];chord=chords[j]
    lift=12<=bar<16;climax=True
    # A driving bass ostinato with anticipations rather than a constant scale run.
    rhythm=[(0,0),(.5,0),(.75,12),(1.25,0),(1.5,0),(2,0),(2.5,7),(2.75,12),(3.25,0),(3.5,0)]
    if lift:rhythm=[(0,0),(1.5,0),(2,0),(3,7),(3.5,12)]
    for at,interval in rhythm:add('bass',base+at,synth(root+interval,.26,'bass'),.22 if climax else .2)
    # Alternating panned arpeggios and soft chord swells, one harmonic part.
    seq=[0,2,1,3,2,1,3,2]
    step=.25 if climax or lift else .5
    for i,at in enumerate(np.arange(0,4,step)):
        note=root+24+chord[seq[i%8]]+(12 if climax and i%4==3 else 0)
        add('harmony',base+at,synth(note,.18,'arp',1.2 if lift else 1),.064 if climax else .055,0)
    if bar>=4:
        dur=4*BEAT;t=np.arange(round(dur*SR))/SR
        pad=np.zeros(len(t))
        for iv in chord[:3]:
            f=hz(root+12+iv);pad+=np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2*t)
        add('harmony',base,pad*env(len(t),.13,.28),.035)
    if False:
        phrase=[(0,root+36,.5),(.75,root+43,.25),(1.5,root+39,.5),(2.5,root+43,.5),(3.5,root+46,.5)]
    elif lift:
        phrase=[(0,melody[j][0][1],1.5),(2,melody[j][-1][1],1.25)]
    else:phrase=melody[j]
    for at,note,duration in phrase:
        if climax and bar>=24 and at==0:note+=12
        add('lead',base+at,synth(note,duration*.93,'lead',1.2 if climax else .86),.155 if climax else .12)
    if climax and bar%4==2:
        for i,note in enumerate([root+48,root+46,root+43,root+39]):add('lead',base+3+i*.25,synth(note,.16,'arp'),.046)
    # Tight kick, broad snare, hats and phrase-ending fills.
    kicks=[0,.75,2,2.75] if bar%2 else [0,1.5,2,3.5]
    if lift:kicks=[0,2]
    for at in kicks:add('drums',base+at,kick());kick_beats.append(base+at)
    for at in [1,3]:add('drums',base+at,snare(),.96)
    for i in range(16):
        if lift and i%2:continue
        add('drums',base+i*.25,hat(i%4==2),.8 if i%2==0 else .44,(-.3 if i%2 else .3))
    if bar%4==3:
        for at in [2.75,3.25,3.5,3.75]:add('drums',base+at,snare(True),.65 if at<3.5 else .9,(-.18 if at%1 else .18))
    if bar in [0,4,16,20,24,28]:add('drums',base,crash(),1.2)

# Noise rise and a tonal octave climb lead into the chorus at bar 16.
start=14*4;dur=8*BEAT;t=np.arange(round(dur*SR))/SR
noise=filt(rng.normal(0,1,len(t)),3500,'highpass')
rise=(t/dur)**2
add('harmony',start,noise*rise*env(len(t),.1,.03),.095)
for i in range(16):add('drums',60+i*.25,snare(True),.25+i*.035)

# Opening five-stab battle fanfare: immediately audible, with no fade-in.
opening=round(4*BEAT*SR)
for part in stems.values():part[:opening]*=.16
for at,length,note in [(0,.32,50),(.5,.32,50),(1,.18,53),(1.25,.18,57),(1.5,1.05,62)]:
    for interval,gain in [(0,.22),(7,.14),(12,.1)]:
        add('lead',at,synth(note+interval,length,'lead',1.3),gain)
    add('bass',at,synth(note-12,length,'bass'),.29)
    add('drums',at,kick(),.95)
    add('drums',at,snare(),.5)
add('drums',1.5,crash(),1.2)
# Light musical compression, independent of voice recognition.
duck=np.ones(N)
for beat in kick_beats:
    a=round(beat*BEAT*SR);l=min(round(.2*SR),N-a);tt=np.arange(l)/SR
    duck[a:a+l]*=1-.22*np.exp(-tt*22)
stems['bass']*=duck[:,None]
stems['harmony']*=(.65+.35*duck[:,None])
for stem,gain in [('lead',.23),('harmony',.17)]:
    dry=stems[stem].copy()
    for repeat in [1,2,3]:
        echo=np.roll(dry,round(BEAT*.75*repeat*SR),axis=0)
        if repeat%2:echo=echo[:,::-1]
        stems[stem]+=echo*gain**repeat
mix=sum(stems.values())
mix-=mix.mean(axis=0)
mix=np.tanh(mix*1.22)
mix*=.89/max(.01,np.max(np.abs(mix)))
out=Path('/tmp/zero-debug-premaster.wav')
write(out,SR,(mix*32767).astype(np.int16))
print(f'{out} | {N/SR:.1f}s | 172 BPM | 32 bars | peak {np.max(np.abs(mix)):.3f}')
