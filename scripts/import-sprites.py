"""Mechanical chroma keying and connected-component sprite-sheet extraction."""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects
source,out,rows=sys.argv[1],sys.argv[2],int(sys.argv[3])
a=np.array(Image.open(source).convert('RGBA'));r,g,b=a[:,:,:3].astype(int).transpose(2,0,1)
labels,n=label(~((r>70)&(b>70)&(abs(r-b)<55)&(g<np.minimum(r,b)*.55)))
objects=find_objects(labels);sizes=np.bincount(labels.ravel());main=[i for i in range(1,n+1) if sizes[i]>2000]
assert len(main)==rows*4,(len(main),rows*4)
main.sort(key=lambda i:((objects[i-1][0].start+objects[i-1][0].stop)/2)//(1024/rows)*2000+(objects[i-1][1].start+objects[i-1][1].stop)/2)
atlas=Image.new('RGBA',(1792,360*rows))
for index,i in enumerate(main):
    selected=labels==i
    for j in range(1,n+1):
        if j in main or sizes[j]<3:continue
        yy,xx=objects[j-1]
        distance=lambda k:max(0,objects[k-1][0].start-yy.stop,yy.start-objects[k-1][0].stop)**2+max(0,objects[k-1][1].start-xx.stop,xx.start-objects[k-1][1].stop)**2
        if min(main,key=distance)==i and distance(i)<=256:selected|=labels==j
    y,x=np.where(selected);crop=a[y.min():y.max()+1,x.min():x.max()+1].copy();crop[:,:,3]=selected[y.min():y.max()+1,x.min():x.max()+1]*255
    im=Image.fromarray(crop);assert im.width<=448 and im.height<=345
    atlas.paste(im,(index%4*448+(448-im.width)//2,index//4*360+345-im.height))
atlas.save(out);print(out, len(main), 'transparent cels')
