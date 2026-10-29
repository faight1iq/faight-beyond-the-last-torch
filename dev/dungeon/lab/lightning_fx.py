import numpy as np, cv2, os, json
rng=np.random.default_rng(7)
P1=[0,14,29,7,69,0,90,25,110,29,117,29,128,32,148,47,152,49,170,54,191,63,217,67,242,70,254,72,265,76,280,83,287,88,289,88]
P2=[141,0,153,23,148,101,90,153,52,195,42,236,31,280,31,294,27,309,22,314,0,343]
O1=(830.04,434.01); O2=(976.88,526.94)
paths=[np.array(P1,float).reshape(-1,2)+O1, np.array(P2,float).reshape(-1,2)+O2]
M=110
allp=np.vstack(paths); x0,y0=np.floor(allp.min(0)-M); x1,y1=np.ceil(allp.max(0)+M)
W,H=int(x1-x0),int(y1-y0); W+=W%2; H+=H%2
paths=[p-(x0,y0) for p in paths]
def resample(p,step=6):
    d=np.r_[0,np.cumsum(np.hypot(*np.diff(p,axis=0).T))]; t=np.arange(0,d[-1],step)
    return np.c_[np.interp(t,d,p[:,0]),np.interp(t,d,p[:,1])]
def smooth(p,k=5):
    q=p.copy()
    for i in range(1,len(p)-1): q[i]=p[max(0,i-k):i+k+1].mean(0)
    return q
paths=[resample(smooth(resample(p,3),4),6) for p in paths]
def jag(p,amp):
    n=len(p); t=np.gradient(p,axis=0); t/=np.linalg.norm(t,axis=1,keepdims=True)+1e-9; nrm=np.c_[-t[:,1],t[:,0]]
    off=np.zeros(n); s=amp
    for oc in [24,10,4,2]:
        k=np.interp(np.arange(n),np.arange(0,n,oc) if n>oc else [0,n-1],rng.normal(0,s,len(np.arange(0,n,oc)) if n>oc else 2)); off+=k; s*=0.55
    off[0]=off[-1]=0; off*=np.minimum(1,np.minimum(np.arange(n),n-1-np.arange(n))/4+0.2)
    return p+nrm*off[:,None]
FPS=24; N=72
os.makedirs('fr',exist_ok=True)
# flicker schedule per path: strike bursts
def sched(seed):
    r=np.random.default_rng(seed); a=np.zeros(N)
    t=0
    while t<N:
        L=r.integers(4,10); a[t:t+L]=r.uniform(0.7,1.0,min(L,N-t))*(r.random(min(L,N-t))>0.15); t+=L
        t+=r.integers(1,5)
    a[a<0.3]=0.25  # always a faint crackle
    return a
S=[sched(11),sched(23)]
for f in range(N):
    core=np.zeros((H,W),np.float32); glow=np.zeros((H,W),np.float32)
    for pi,p in enumerate(paths):
        a=S[pi][f]
        for k in range(2 if a>0.5 else 1):
            q=jag(p,9 if k==0 else 14)
            pts=np.round(q*4).astype(np.int32).reshape(-1,1,2)
            cv2.polylines(core,[pts],False,a*(1.0 if k==0 else 0.6),2 if k==0 else 1,cv2.LINE_AA,shift=2)
            cv2.polylines(glow,[pts],False,a,7,cv2.LINE_AA,shift=2)
            # branches
            if a>0.5:
                for _ in range(rng.integers(1,4)):
                    i=rng.integers(3,len(q)-3); L=rng.integers(5,14)
                    d=q[min(i+1,len(q)-1)]-q[i]; d/=np.linalg.norm(d)+1e-9
                    ang=rng.choice([-1,1])*rng.uniform(0.5,1.1); R=np.array([[np.cos(ang),-np.sin(ang)],[np.sin(ang),np.cos(ang)]])
                    b=q[i]+np.cumsum(np.tile(R@d*6,(L,1))+rng.normal(0,3,(L,2)),axis=0); b=np.vstack([q[i],b])
                    cv2.polylines(core,[np.round(b*4).astype(np.int32).reshape(-1,1,2)],False,a*0.6,1,cv2.LINE_AA,shift=2)
                    cv2.polylines(glow,[np.round(b*4).astype(np.int32).reshape(-1,1,2)],False,a*0.5,4,cv2.LINE_AA,shift=2)
    g1=cv2.GaussianBlur(glow,(0,0),6); g2=cv2.GaussianBlur(glow,(0,0),22)
    halo=np.clip(g1*0.9+g2*1.6,0,1); c=np.clip(core,0,1)
    alpha=np.clip(np.maximum(c, halo*0.85),0,1)
    blue=np.array([255,200,120],np.float32)  # BGR -> light blue
    white=np.array([255,255,255],np.float32)
    col=(blue*halo[...,None]+white*c[...,None]*1.2); col=np.clip(col/np.maximum(alpha[...,None],1e-3),0,255)
    out=np.dstack([col,alpha*255]).astype(np.uint8)
    cv2.imwrite(f'fr/{f:03d}.png',out)
json.dump({'x':float(x0),'y':float(y0),'w':W,'h':H},open('tile.json','w')); print(x0,y0,W,H)
