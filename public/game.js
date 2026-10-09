const SCALE = 3.5;

class Game {
    constructor(gameContainer) {
        // console.log("Game 类已实例化");
        this.gameContainer = gameContainer;
        this.gameArea = gameContainer.querySelector('#game-area');
        this.gameArea.style.position = 'relative';
        this.gameArea.style.width = '100%';
        this.gameArea.style.height = '100%';
        this.gameArea.style.overflow = 'hidden';
        this.width = this.gameArea.clientWidth;
        this.height = this.gameArea.clientHeight;
        
        this.state = 'menu';
        this.score = 0;
        this.lives = 3; // 设置生命值为3
        this.timeLeft = 60; // 设置游戏时间为60秒
        this.countdownTime = 5;
        this.countdownTimer = null;
        this.countdownStartTime = null;
        this.isCountingDown = false;

        // 绑定方法到实例
        this.updateGame = this.updateGame.bind(this);
        this.handleClick = this.handleClick.bind(this);

        this.difficulty = 1;

        this.videoElement = document.getElementById('input-video');
        this.poseCanvas = document.getElementById('pose-canvas');
        this.poseCanvas.width = this.width;
        this.poseCanvas.height = this.height;
        this.gameCanvas = document.getElementById('game-canvas');
        this.gameCanvas.width = this.width;
        this.gameCanvas.height = this.height;
        this.ctx = this.gameCanvas.getContext("2d");
        this.ctx.lineWidth=10;
        this.ctx.lineCap="round";
        this.playercolour=[0,0,0];
        this.gamestate=-1;
        this.posea=[-1,160,160,160,160,40,40,150,150];
        this.poseb=[-1,160,160,160,160,40,40,150,150];
        this.poses=[[-1,160,160,160,160,40,40,150,150]
        ,[1,180,180,160,170,90,80,180,330]
        ,[0,180,180,170,160,80,90,330,180]
        ,[1,180,180,160,170,80,90,180,260]
        ,[0,180,180,170,160,90,80,260,180]
        ,[1,180,180,160,170,40,30,180,180]
        ,[0,180,180,170,160,30,40,180,180]
        ,[1,180,180,160,170,80,95,260,255]
        ,[0,180,180,170,160,95,80,255,260]
        ,[1,180,180,160,170,116,130,180,180]
        ,[0,180,180,170,160,130,116,180,180]
        ,[1,180,180,160,170,80,95,180,180]
        ,[0,180,180,170,160,95,80,180,180]
        ];
        this.poser = new StickAnimation(this.poses[0],[],1000);

        // 检查可用的摄像头
        this.checkAvailableCameras().then(devices => {
            if (devices.length > 0) {
                this.startCamera(devices[0].deviceId);
            } else {
                console.error("No cameras found");
                this.handleCameraError(new Error("No cameras found"));
            }
        }).catch(error => {
            console.error("Error checking cameras:", error);
            this.handleCameraError(error);
        });

        // 添加这些行来检查 pose-container 的位置
        const poseContainer = document.getElementById('pose-container');
        console.log('Pose container position:', poseContainer.getBoundingClientRect());
        console.log('Pose container style:', window.getComputedStyle(poseContainer));

        this.difficultyScreen = new DifficultyScreen(this);

        this.menu = new Menu(this);
        this.state = 'menu';
        this.menu.draw(); // 初始显示菜单
        
        // 开始游戏循环
        this.updateGame();

        this.gameTime = 0;

        // 初始化音效
        this.catchSound = new Audio('public/Assets/sound/kaching.ogg');
        
        this.landmarkData = [];
        this.userId = null;
        this.isCollectingData = false;
        this.lastDataCollectionTime = 0;
        this.dataCollectionInterval = 1000 / 30; // 每30帧数据
        
        // 添加新的音效
        this.slapSound = new Audio('public/Assets/sound/slap.ogg');
        this.squeak = new Audio('public/Assets/sound/baby-squeak-toy-2-183912.ogg');
        this.screamingSound = new Audio('public/Assets/sound/screaming.ogg');
        this.gameplayMusic = new Audio('public/Assets/sound/Komiku_-_12_-_Bicycle.ogg');
        this.menuMusic = new Audio('public/ssets/sound/music.ogg');
        
        this.poseDetection = null; // 添加这行

        this.isMovingLeft = false; // 初始化移动方向

        this.drawStick();
        this.drawPlayer();
    }

    async checkAvailableCameras() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    }

    startCamera(deviceId) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                deviceId: deviceId,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            } 
        }).then(stream => {
            this.videoElement.srcObject = stream;
            this.videoElement.onloadedmetadata = () => {
                this.videoElement.play();
                console.log("Video is playing");
                
                // 视频流设置好后，初始化姿势检测
                this.poseDetection = new PoseDetection(this.videoElement, this.poseCanvas, this.onPoseDetected.bind(this));
                this.poseDetection.start().catch(error => {
                    console.error("Failed to start pose detection:", error);
                });
            };
        }).catch(error => {
            console.error("Error accessing camera:", error);
            this.handleCameraError(error);
        });
    }

    useFallbackControl() {
        console.log("Using fallback mouse control");
        // 这里可以添加使用鼠标控制的逻辑
        this.gameArea.addEventListener('mousemove', (event) => {
            const rect = this.gameArea.getBoundingClientRect();
            const x = event.clientX - rect.left;
            // this.updatePlayerPosition(x);
        });
    }

    start() {
        console.log("Game.start() called");
        this.state = 'difficulty';
        this.difficultyScreen.draw();
    }

    updateGame() {
        // console.log("Current game state:", this.state);
        switch (this.state) {
            case 'menu':
                // 菜单状态下不需要更新，保持静态
                break;
            case 'difficulty':
                // 难度选择界面由 DifficultyScreen 类处理
                break;
            case 'countdown':
                // 倒计时现在由 updateCountdown 方法处理
                break;
            case 'playing':
                this.updatePlaying();
                break;
            case 'gameover':
                // 游戏结束状态保持静态
                break;
        }

        requestAnimationFrame(this.updateGame.bind(this));
    }
    updatePlaying() {
        // 生成新的对象
        const settings = difficulty_map[this.difficulty];
        
        this.clearGameObjects();

        this.drawHUD();
        this.ctx.clearRect(0,0,this.width,this.height);
        this.posea=this.poser.currentFrame();
        this.drawStick();
        this.drawPlayer();
        this.checkPose();

        if (this.poser.done){
            this.gamestate++;
            this.gamestate%=4;
            switch (this.gamestate){
                case 0:
                    this.poser =
                        new StickAnimation(this.poses[0],this.poses[1+Math.floor(Math.random()*(this.poses.length-1))],500);
                    break;
                case 1:
                    this.poser = new StickAnimation(this.posea,[],5000);
                    break;
                case 2:
                    this.poser = new StickAnimation(this.posea,this.poses[0],500);
                    break;
                case 3:
                    this.poser = new StickAnimation(this.poses[0],[],2000);
                    break;
            }
        }

        this.gameTime += Date.now() - this.lastUpdateTime;
        this.lastUpdateTime = Date.now();
        this.timeLeft = Math.max(0, 60000 - this.gameTime);
        if (this.timeLeft <= 0 || this.lives <= 0) {
            this.endGame();
        }
    }

    checkPose(){
        if (this.gamestate!=1){return;}
        let match=true;
        const margin = 15;
        for (let i=0;i<9;i++){
            if (Math.abs(this.posea[i]-this.poseb[i])>margin){
                match=false;
            }
        }
        if (match){
            this.score+=10;
            this.poser.cancel();
            this.playercolour=[0,255,0];
        }
    }

    drawLine(xy,l,a){
        a = a/180*Math.PI;
        this.ctx.beginPath();
        this.ctx.moveTo(xy[0]*SCALE,xy[1]*SCALE);
        this.ctx.lineTo(xy[0]*SCALE+Math.cos(a)*l*SCALE,xy[1]*SCALE-Math.sin(a)*l*SCALE);
        this.ctx.stroke();
        // console.log("drew line from %d %d to %d %d",xy[0]*SCALE,xy[1]*SCALE,xy[0]*SCALE+Math.cos(a)*l*SCALE,xy[1]*SCALE-Math.sin(a)*l*SCALE)
        return [xy[0]+Math.cos(a)*l,xy[1]-Math.sin(a)*l];
    }

    drawStick() {
        // this.posea=[0,160,160,160,160,40,40,150,150];
        this.ctx.strokeStyle='rgb(0,0,200)';
        if (this.posea[0]==0){
            let xyl = [140,190];
            xyl = this.drawLine(xyl,30,90);
            xyl = this.drawLine(xyl,30,this.posea[1]-90);
            let xyr = xyl;
            xyr = this.drawLine(xyr,30,90+this.posea[1]-this.posea[3]-this.posea[4]);
            this.drawLine(xyr,30,-(90-this.posea[1]-this.posea[2]+this.posea[3]+this.posea[4]));
            xyl = this.drawLine(xyl,42,90+this.posea[1]-this.posea[3]);
            xyr = xyl;
            xyl = this.drawLine(xyl,25,-90+this.posea[1]-this.posea[3]-this.posea[5]);
            xyl = this.drawLine(xyl,25,90+this.posea[1]-this.posea[3]-this.posea[5]-this.posea[7]);
            xyl = xyr;
            xyr = this.drawLine(xyr,25,-90+this.posea[1]-this.posea[3]+this.posea[6]);
            xyr = this.drawLine(xyr,25,-270+this.posea[1]-this.posea[3]+this.posea[6]+this.posea[8]);
            xyl = this.drawLine(xyl,7,90+this.posea[1]-this.posea[3]);
            this.ctx.beginPath();
            const r=17;
            this.ctx.arc(xyl[0]*SCALE,xyl[1]*SCALE-r*SCALE,r*SCALE,0,2*Math.PI);
            this.ctx.stroke();
        }else{
            let xyr = [160.5212,190];
            xyr = this.drawLine(xyr,30,90);
            xyr = this.drawLine(xyr,30,270-this.posea[2]);
            let xyl = xyr;
            xyl = this.drawLine(xyl,30,90-this.posea[2]+this.posea[4]+this.posea[3]);
            this.drawLine(xyl,30,270-this.posea[2]-this.posea[1]+this.posea[4]+this.posea[3]);
            xyr = this.drawLine(xyr,42,90-this.posea[2]+this.posea[4]);
            xyl = xyr;
            xyr = this.drawLine(xyr,25,-90-this.posea[2]+this.posea[4]+this.posea[6]);
            xyr = this.drawLine(xyr,25,90-this.posea[2]+this.posea[4]+this.posea[6]+this.posea[8]);
            xyr = xyl;
            xyl = this.drawLine(xyl,25,-90-this.posea[2]+this.posea[4]-this.posea[5]);
            xyl = this.drawLine(xyl,25,90-this.posea[2]+this.posea[4]-this.posea[5]-this.posea[7]);
            xyr = this.drawLine(xyr,7,90-this.posea[2]+this.posea[4]);
            this.ctx.beginPath();
            const r=17;
            this.ctx.arc(xyr[0]*SCALE,xyr[1]*SCALE-r*SCALE,r*SCALE,0,2*Math.PI);
            this.ctx.stroke();

        }
    }

    drawPlayer() {
        // this.posea=[0,160,160,160,160,40,40,150,150];
        this.ctx.strokeStyle=`rgb(${this.playercolour[0]},${this.playercolour[1]},${this.playercolour[2]})`;
        if (this.playercolour[1]!=0){
            this.playercolour[1]-=(Date.now()-this.lastUpdateTime)*0.2;
        }
        if (this.poseb[0]==0){
            let xyl = [290,190];
            xyl = this.drawLine(xyl,30,90);
            xyl = this.drawLine(xyl,30,this.poseb[1]-90);
            let xyr = xyl;
            xyr = this.drawLine(xyr,30,90+this.poseb[1]-this.poseb[3]-this.poseb[4]);
            this.drawLine(xyr,30,-(90-this.poseb[1]-this.poseb[2]+this.poseb[3]+this.poseb[4]));
            xyl = this.drawLine(xyl,42,90+this.poseb[1]-this.poseb[3]);
            xyr = xyl;
            xyl = this.drawLine(xyl,25,-90+this.poseb[1]-this.poseb[3]-this.poseb[5]);
            xyl = this.drawLine(xyl,25,90+this.poseb[1]-this.poseb[3]-this.poseb[5]-this.poseb[7]);
            xyl = xyr;
            xyr = this.drawLine(xyr,25,-90+this.poseb[1]-this.poseb[3]+this.poseb[6]);
            xyr = this.drawLine(xyr,25,-270+this.poseb[1]-this.poseb[3]+this.poseb[6]+this.poseb[8]);
            xyl = this.drawLine(xyl,7,90+this.poseb[1]-this.poseb[3]);
            this.ctx.beginPath();
            const r=17;
            this.ctx.arc(xyl[0]*SCALE,xyl[1]*SCALE-r*SCALE,r*SCALE,0,2*Math.PI);
            this.ctx.stroke();
        }else{
            let xyr = [310.5212,190];
            xyr = this.drawLine(xyr,30,90);
            xyr = this.drawLine(xyr,30,270-this.poseb[2]);
            let xyl = xyr;
            xyl = this.drawLine(xyl,30,90-this.poseb[2]+this.poseb[4]+this.poseb[3]);
            this.drawLine(xyl,30,270-this.poseb[2]-this.poseb[1]+this.poseb[4]+this.poseb[3]);
            xyr = this.drawLine(xyr,42,90-this.poseb[2]+this.poseb[4]);
            xyl = xyr;
            xyr = this.drawLine(xyr,25,-90-this.poseb[2]+this.poseb[4]+this.poseb[6]);
            xyr = this.drawLine(xyr,25,90-this.poseb[2]+this.poseb[4]+this.poseb[6]+this.poseb[8]);
            xyr = xyl;
            xyl = this.drawLine(xyl,25,-90-this.poseb[2]+this.poseb[4]-this.poseb[5]);
            xyl = this.drawLine(xyl,25,90-this.poseb[2]+this.poseb[4]-this.poseb[5]-this.poseb[7]);
            xyr = this.drawLine(xyr,7,90-this.poseb[2]+this.poseb[4]);
            this.ctx.beginPath();
            const r=17;
            this.ctx.arc(xyr[0]*SCALE,xyr[1]*SCALE-r*SCALE,r*SCALE,0,2*Math.PI);
            this.ctx.stroke();

        }
    }

    handleClick(event) {
        if (this.state !== 'menu') {
            const rect = this.gameArea.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            if (this.state === 'difficulty') {//this causes error
                // 处理难度选择界面的点击
                const result = this.difficultyScreen.handleClick(x, y);
                if (result) {
                    if (result.action === 'back') {
                        this.state = 'menu';
                        this.menu.draw();
                    } else if (result.action === 'submit') {
                        this.startGame(result.difficulty);
                    }
                }
            }
        }
    }
    handleMouseMove(event) {
        if (this.state === 'playing') {
            const rect = this.gameArea.getBoundingClientRect();
            const x = event.clientX - rect.left;
            // this.updatePlayerPosition(x);
        }
    }

    showPoseCanvas() {
        const poseContainer = document.getElementById('pose-container');
        if (poseContainer) {
            poseContainer.style.display = 'block';
        }
    }
    hidePoseCanvas() {
        const poseContainer = document.getElementById('pose-container');
        if (poseContainer) {
            poseContainer.style.display = 'none';
        }
    }
    onPoseDetected(results) {
        function angler(p1,p2,pos=false){
            let ans=(Math.atan((results.poseLandmarks[p1].y-results.poseLandmarks[p2].y)/
            (results.poseLandmarks[p2].x-results.poseLandmarks[p1].x))/Math.PI*180);
            if (results.poseLandmarks[p2].x<results.poseLandmarks[p1].x){
                ans+=180;
                if (results.poseLandmarks[p1].y<results.poseLandmarks[p2].y){
                    ans-=360;
                }
            }
            if (pos&&ans<0){ans+=360;}
            return ans;
        }
        if (this.state !== 'playing' && this.state !== 'countdown') return;

        if (results.poseLandmarks) {
            // 翻转关键点的 x 坐标
            results.poseLandmarks.forEach(landmark => {
                landmark.x = 1 - landmark.x;
            });
            const POSE_FACTORS = [0.8,0.65,0.2,0.6,1.1,0.1];
            // 获取肩部和臀部的关键点
            if (angler(24,26)>-85){
                this.poseb[0]=0;
                this.poseb[1]=Math.min(180,160+(90+angler(24,26))*POSE_FACTORS[0]);
                this.poseb[2]=Math.min(this.poseb[1],180-(angler(24,26)-angler(26,28))*POSE_FACTORS[1]);
                this.poseb[3]=Math.min(180,160+(90+angler(24,26))*POSE_FACTORS[2]);
                this.poseb[4]=160;
            }else{
                this.poseb[0]=1;
                this.poseb[2]=Math.min(180,160-(90+angler(23,25))*POSE_FACTORS[0]);
                this.poseb[1]=Math.min(this.poseb[2],180+(angler(23,25)-angler(25,27))*POSE_FACTORS[1]);
                this.poseb[4]=Math.min(180,160-(90+angler(23,25))*POSE_FACTORS[2]);
                this.poseb[3]=160;
            }
            this.poseb[5]=25+(angler(11,23,true)-angler(11,13,true))*POSE_FACTORS[3];
            this.poseb[6]=25+(angler(12,14)-angler(12,24))*POSE_FACTORS[3];
            this.poseb[7]=175+this.poseb[5]*POSE_FACTORS[5]+(angler(11,13,true)-angler(13,15,true))*POSE_FACTORS[4];
            this.poseb[8]=175+this.poseb[6]*POSE_FACTORS[5]-(angler(12,14,true)-angler(14,16,true))*POSE_FACTORS[4];
            // console.log(angler(11,23,true));
            // console.log(angler(11,13,true));
            // if (this.state === 'playing' && this.isPlayerRaisingArms) {
            //     this.checkCollisions();
            // }

            if (this.isCollectingData) {
                this.collectPoseData(results);
            }
        }

        this.drawPoseLandmarks(results);
    }
    handleCameraError(error) {
        let errorMessage = "无法访问摄像头。";
        if (error.name === "NotReadableError") {
            errorMessage += "请确保摄像头未其他程序占。";
        } else if (error.name === "NotAllowedError") {
            errorMessage += "请确保已授予浏览使用摄像头的权。";
        } else if (error.message === "No cameras found") {
            errorMessage = "未检测到可用的摄像头。";
        } else {
            errorMessage += "请检查摄像头连接并刷新页面重试。";
        }
        alert(errorMessage);
    }

    drawHUD() {
        const hudElement = document.createElement('div');
        hudElement.id = 'hud';
        hudElement.innerHTML = `
            <p style="font-size: 48px;">Score: ${this.score}</p>
            <p style="font-size: 48px;">Lives: ${this.lives}</p>
            <p style="font-size: 48px;">Time: ${Math.floor(this.timeLeft/1000)}</p>
        `;
        this.gameArea.appendChild(hudElement);
    }

    startGame() {
        this.clearGameObjects();
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 60;
        this.state = 'countdown';
        this.countdownTime = 5;
        this.countdownStartTime = Date.now();
        this.gameTime = 0;

        // 确保难度设置被正确应用
        if (!this.difficulty || !difficulty_map[this.difficulty]) {
            console.log("Setting default difficulty to medium");
            this.difficulty = 'medium';
        }
        
        const settings = difficulty_map[this.difficulty];
        console.log(`Starting game with difficulty: ${this.difficulty}`, settings);
        
        // Initialize and start pose detection
        // this.initializePoseDetection();
        this.showPoseCanvas();

        this.updateCountdown();

        if (this.menuMusic) {
            this.menuMusic.pause();
        }
        if (this.gameplayMusic) {
            this.gameplayMusic.currentTime = 0;
            this.gameplayMusic.loop = true;
            // this.gameplayMusic.play();
        }
    }
    updateCountdown() {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.countdownStartTime) / 1000;
        const remainingTime = Math.ceil(5 - elapsedTime);

        // 清除之前的计时元素
        const existingCountdown = document.getElementById('countdown');
        if (existingCountdown) {
            existingCountdown.remove();
        }

        if (remainingTime > 0) {
            const countdownElement = document.createElement('div');
            countdownElement.id = 'countdown';
            countdownElement.style.position = 'absolute';
            countdownElement.style.top = '50%';
            countdownElement.style.left = '50%';
            countdownElement.style.transform = 'translate(-50%, -50%)';
            countdownElement.style.fontSize = '72px';
            countdownElement.style.color = 'white';
            countdownElement.textContent = remainingTime;
            this.gameArea.appendChild(countdownElement);

            // 设置下一秒更新
            setTimeout(() => this.updateCountdown(), 1000);
        } else {
            // 倒计时结束,开始游戏
            this.state = 'playing';
            this.gameTime = 0;
            this.lastUpdateTime = Date.now();
            console.log("Countdown finished, starting game");
        }
    }

    endGame() {
        console.log("Game ended");
        this.state = 'gameover';
        this.drawGameOver();

        this.hidePoseCanvas();

        this.gameplayMusic.pause();
        this.menuMusic.play();
    }
    drawGameOver() {
        this.clearGameObjects();
        const gameOverElement = document.createElement('div');
        gameOverElement.id = 'game-over';
        gameOverElement.style.position = 'absolute';
        gameOverElement.style.top = '50%';
        gameOverElement.style.left = '50%';
        gameOverElement.style.transform = 'translate(-50%, -50%)';
        gameOverElement.style.textAlign = 'center';
        gameOverElement.style.color = 'white';
        gameOverElement.style.fontSize = '24px';
        gameOverElement.style.zIndex = '1000';

        const scoreText = document.createElement('h2');
        scoreText.textContent = `Your Score: ${this.score}`;
        scoreText.style.color = 'yellow';
        gameOverElement.appendChild(scoreText);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';

        const buttonStyle = `
            font-size: 24px;
            padding: 10px 20px;
            margin: 10px;
            cursor: pointer;
            background-color: #4CAF50;
            color: yellow;
            border: none;
            border-radius: 5px;
        `;

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart';
        restartButton.style.cssText = buttonStyle;
        restartButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startGame();
        });

        const quitButton = document.createElement('button');
        quitButton.textContent = 'Quit';
        quitButton.style.cssText = buttonStyle;
        quitButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.state = 'menu';
            this.menu.draw();
        });

        buttonContainer.appendChild(restartButton);
        buttonContainer.appendChild(quitButton);
        gameOverElement.appendChild(buttonContainer);

        this.gameArea.appendChild(gameOverElement);
    }

    drawPoseLandmarks(results) {
        const ctx = this.poseCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.poseCanvas.width, this.poseCanvas.height);

        if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
            drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
        }
    }
    collectPoseData() {
        if (this.isCollectingData && Date.now() - this.lastDataCollectionTime < this.dataCollectionInterval) {return;}
            
        if (this.poseDetection && this.poseDetection.lastResults) {
            const timestamp = new Date().toISOString();
            const frameData = {
                frame: this.landmarkData.length,
                timestamp: timestamp
            };

            this.poseDetection.lastResults.poseLandmarks.forEach((landmark, index) => {
                const names = ['NOSE', 'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER', 'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER', 'LEFT_EAR', 'RIGHT_EAR', 'MOUTH_LEFT', 'MOUTH_RIGHT', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_WRIST', 'RIGHT_WRIST', 'LEFT_PINKY', 'RIGHT_PINKY', 'LEFT_INDEX', 'RIGHT_INDEX', 'LEFT_THUMB', 'RIGHT_THUMB', 'LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE', 'LEFT_HEEL', 'RIGHT_HEEL', 'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX'];
                frameData[`${names[index]}_x`] = landmark.x;
                frameData[`${names[index]}_y`] = landmark.y;
            });

            this.landmarkData.push(frameData);
        }
    }

    clearGameObjects() {
        this.gameArea.innerHTML = ''; // 清除游戏区域的所有内容
    }

    showDifficultyScreen() {
        this.state = 'difficulty';
        this.difficultyScreen.draw();
    }
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        console.log(`Difficulty set to: ${difficulty}`);
        // 应用难度设置
        const settings = difficulty_map[difficulty];
        if (settings) {
            console.log('Applying difficulty settings:', settings);
            this.spawnInterval = settings.STAR_SPAWN_TIME * 1000;
        } else {
            console.warn('Invalid difficulty setting, using default');
            this.difficulty = 'medium';
            this.spawnInterval = difficulty_map['medium'].STAR_SPAWN_TIME * 1000;
        }
    }
}
