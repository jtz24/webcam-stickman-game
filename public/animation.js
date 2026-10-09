class StickAnimation{
    constructor(startpose,endpose,duration){
        this.pose=startpose.slice();
        this.endpose=endpose.slice();
        if (this.pose[0]==-1){
            this.pose[0]=this.endpose[0];
        }
        if (this.endpose[0]==-1){
            this.endpose[0]=this.pose[0];
        }
        this.duration=duration;
        this.starttime=Date.now();
        this.done=false;
    }
    currentFrame(){
        if (this.endpose.length==0){
            if (Date.now()-this.starttime>=this.duration){
                this.done=true;
            }
            return this.pose;
        }
        for (let i=1;i<9;i++){
            this.pose[i]+=(this.endpose[i]-this.pose[i])*(Date.now()-this.starttime)/this.duration/5;
        }
        if (Date.now()-this.starttime>=this.duration){
            this.pose=this.endpose.slice();
            this.done=true;
        }
        return this.pose;
    }
    cancel(){
        this.done=true;
    }
}