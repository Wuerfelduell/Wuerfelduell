import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const bridge=window.WDTestLabDiceBridge;
if(!bridge){
  console.warn('[Würfelduell 3D Dice] Test-Lab bridge not available.');
} else {
  const state={
    enabled:true,
    ready:false,
    scene:null,
    camera:null,
    renderer:null,
    world:null,
    tray:null,
    dice:[],
    raycaster:new THREE.Raycaster(),
    pointer:new THREE.Vector2(),
    lastSnapshot:[],
    lastDesign:'',
    lastRollSignature:'',
    forceSnapTimers:[],
    solveToken:0,
    solveRunning:false,
    queuedSnapshot:null,
    playback:null,
    animationId:0,
    lastTime:performance.now(),
    resizeObserver:null
  };

  const FACE_BY_MATERIAL=[3,4,1,6,2,5]; // +X,-X,+Y,-Y,+Z,-Z
  const NORMAL_BY_VALUE={
    1:new THREE.Vector3(0,1,0),
    6:new THREE.Vector3(0,-1,0),
    3:new THREE.Vector3(1,0,0),
    4:new THREE.Vector3(-1,0,0),
    2:new THREE.Vector3(0,0,1),
    5:new THREE.Vector3(0,0,-1)
  };

  const DESIGN_THEMES={
    classic:{body:'#f4f4f1',pip:'#161619',edge:'#ffffff',metalness:.03,roughness:.62},
    gold:{body:'#cfa62e',pip:'#3a2400',edge:'#ffe58a',metalness:.72,roughness:.28},
    obsidian:{body:'#15151c',pip:'#f3f3f7',edge:'#45455c',metalness:.35,roughness:.38},
    blood:{body:'#74121d',pip:'#ffd8dd',edge:'#bf3140',metalness:.18,roughness:.46},
    arcane:{body:'#402270',pip:'#efe1ff',edge:'#8f6dce',metalness:.23,roughness:.4},
    emerald:{body:'#17603f',pip:'#d9ffe8',edge:'#43b67a',metalness:.18,roughness:.44},
    frost:{body:'#c8f4ff',pip:'#16475d',edge:'#edfdff',metalness:.12,roughness:.34},
    pearl:{body:'#eee7df',pip:'#544b55',edge:'#ffffff',metalness:.18,roughness:.3},
    neon:{body:'#17171c',pip:'#7dff8d',edge:'#2bcf49',metalness:.25,roughness:.34},
    void:{body:'#1b1029',pip:'#d5a1ff',edge:'#70409a',metalness:.35,roughness:.3},
    storm:{body:'#26374b',pip:'#bcecff',edge:'#5da7d4',metalness:.5,roughness:.28},
    chrome:{body:'#aeb4ba',pip:'#21252b',edge:'#f3f6f8',metalness:.95,roughness:.17}
  };

  function inLab(){
    try{return !!bridge.isActive();}catch(_){return false;}
  }

  function makeCanvasTexture(value,theme){
    const size=256;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');

    ctx.fillStyle=theme.body;
    ctx.fillRect(0,0,size,size);

    // Very subtle center lighting baked into the face so flat faces don't look dead.
    const sheen=ctx.createRadialGradient(size*.34,size*.25,8,size*.5,size*.5,size*.72);
    sheen.addColorStop(0,'rgba(255,255,255,.16)');
    sheen.addColorStop(.55,'rgba(255,255,255,.025)');
    sheen.addColorStop(1,'rgba(0,0,0,.08)');
    ctx.fillStyle=sheen;
    ctx.fillRect(0,0,size,size);

    const pos={
      tl:[.29,.29],tc:[.5,.29],tr:[.71,.29],
      ml:[.29,.5],mc:[.5,.5],mr:[.71,.5],
      bl:[.29,.71],bc:[.5,.71],br:[.71,.71]
    };
    const patterns={
      1:['mc'],
      2:['tl','br'],
      3:['tl','mc','br'],
      4:['tl','tr','bl','br'],
      5:['tl','tr','mc','bl','br'],
      6:['tl','ml','bl','tr','mr','br']
    };
    ctx.fillStyle=theme.pip;
    for(const key of patterns[value]||[]){
      const [x,y]=pos[key];
      ctx.beginPath();
      ctx.arc(x*size,y*size,size*.067,0,Math.PI*2);
      ctx.fill();
    }

    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=4;
    return tex;
  }

  function buildMaterials(design){
    const theme=DESIGN_THEMES[design]||DESIGN_THEMES.classic;
    return FACE_BY_MATERIAL.map(value=>{
      const texture=makeCanvasTexture(value,theme);
      return new THREE.MeshStandardMaterial({
        map:texture,
        color:0xffffff,
        metalness:theme.metalness,
        roughness:theme.roughness
      });
    });
  }

  function disposeMaterials(materials){
    for(const m of materials||[]){
      m.map?.dispose?.();
      m.dispose?.();
    }
  }

  function init(){
    if(state.ready) return;

    const game=document.getElementById('game');
    const diceDom=document.getElementById('dice');
    if(!game||!diceDom) return;

    const tray=document.createElement('section');
    tray.id='testLab3dDiceTray';
    tray.className='test-lab-3d-tray';
    tray.innerHTML=`
      <div class="test-lab-3d-head">
        <div>
          <strong>🎲 Physics Dice Tray</strong>
          <small>Three.js + cannon-es · Trajectory Solver V3</small>
        </div>
        <div class="test-lab-3d-status" id="testLab3dStatus">initialisiere…</div>
      </div>
      <div class="test-lab-3d-stage" id="testLab3dStage"></div>
      <div class="test-lab-3d-hint">3D-Würfel antippen = auswählen · physisch berechnete Trajektorien · kein Replay-Drift · Locks bleiben liegen</div>
    `;
    diceDom.parentNode.insertBefore(tray,diceDom);
    state.tray=tray;

    const stage=tray.querySelector('#testLab3dStage');

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x0c0b10);
    scene.fog=new THREE.Fog(0x0c0b10,12,24);
    state.scene=scene;

    const camera=new THREE.PerspectiveCamera(35,1,.1,50);
    camera.position.set(0,8.2,8.8);
    camera.lookAt(0,-.4,0);
    state.camera=camera;

    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    stage.appendChild(renderer.domElement);
    state.renderer=renderer;

    // Light rig: soft top light + cool fill + warm rim.
    scene.add(new THREE.HemisphereLight(0xbfd8ff,0x1a0d09,1.55));

    const key=new THREE.DirectionalLight(0xffffff,3.0);
    key.position.set(-3,9,5);
    key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-7;key.shadow.camera.right=7;
    key.shadow.camera.top=7;key.shadow.camera.bottom=-7;
    scene.add(key);

    const rim=new THREE.PointLight(0xff6a52,18,15,2);
    rim.position.set(5,3,-4);
    scene.add(rim);

    const fill=new THREE.PointLight(0x578cff,13,16,2);
    fill.position.set(-5,2,3);
    scene.add(fill);

    // Visual tray floor.
    const floorMat=new THREE.MeshStandardMaterial({
      color:0x211b22,roughness:.96,metalness:.02
    });
    const floor=new THREE.Mesh(new THREE.BoxGeometry(10.8,.45,6.8),floorMat);
    floor.position.y=-1.26;
    floor.receiveShadow=true;
    scene.add(floor);

    // Slight inset felt surface.
    const felt=new THREE.Mesh(
      new THREE.BoxGeometry(9.7,.08,5.7),
      new THREE.MeshStandardMaterial({color:0x2a1c24,roughness:1,metalness:0})
    );
    felt.position.y=-.995;
    felt.receiveShadow=true;
    scene.add(felt);

    const railMat=new THREE.MeshStandardMaterial({
      color:0x3d2524,roughness:.62,metalness:.08
    });
    const railSpecs=[
      [0,-.42,-3.1,11.2,.8,.48],
      [0,-.42, 3.1,11.2,.8,.48],
      [-5.25,-.42,0,.48,.8,6.2],
      [ 5.25,-.42,0,.48,.8,6.2]
    ];
    for(const [x,y,z,w,h,d] of railSpecs){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),railMat);
      rail.position.set(x,y,z);
      rail.castShadow=true;rail.receiveShadow=true;
      scene.add(rail);
    }

    // Physics.
    const world=new CANNON.World({
      gravity:new CANNON.Vec3(0,-22,0),
      allowSleep:true
    });
    world.broadphase=new CANNON.SAPBroadphase(world);
    world.solver.iterations=12;
    world.solver.tolerance=.001;
    state.world=world;

    const floorMaterial=new CANNON.Material('tray');
    const diceMaterial=new CANNON.Material('dice');
    world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial,floorMaterial,{
      friction:.42,restitution:.32,contactEquationStiffness:1e8
    }));
    world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial,diceMaterial,{
      friction:.28,restitution:.38,contactEquationStiffness:1e8
    }));

    const floorBody=new CANNON.Body({mass:0,material:floorMaterial});
    floorBody.addShape(new CANNON.Box(new CANNON.Vec3(5.35,.22,3.35)));
    floorBody.position.set(0,-1.26,0);
    world.addBody(floorBody);

    function wall(x,y,z,hx,hy,hz){
      const body=new CANNON.Body({mass:0,material:floorMaterial});
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx,hy,hz)));
      body.position.set(x,y,z);world.addBody(body);
    }
    wall(0,-.35,-3.25,5.55,.65,.18);
    wall(0,-.35, 3.25,5.55,.65,.18);
    wall(-5.4,-.35,0,.18,.65,3.25);
    wall( 5.4,-.35,0,.18,.65,3.25);

    const design=bridge.diceDesign();
    state.lastDesign=design;
    for(let i=0;i<5;i++){
      const geometry=new THREE.BoxGeometry(1.02,1.02,1.02,3,3,3);
      const materials=buildMaterials(design);
      const mesh=new THREE.Mesh(geometry,materials);
      mesh.castShadow=true;mesh.receiveShadow=true;
      mesh.userData.dieIndex=i;

      const edges=new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry,18),
        new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.11})
      );
      edges.userData.isDieEdge=true;
      mesh.add(edges);
      scene.add(mesh);

      const body=new CANNON.Body({
        mass:1,
        material:diceMaterial,
        linearDamping:.08,
        angularDamping:.08,
        allowSleep:true,
        sleepSpeedLimit:.16,
        sleepTimeLimit:.65
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(.50,.50,.50)));
      body.position.set((i-2)*1.35,1.5+Math.random()*2,(Math.random()-.5)*2);
      world.addBody(body);

      state.dice.push({
        index:i,mesh,body,materials,edges,
        target:null,locked:false,selected:false,
        snapTimer:null
      });
    }

    renderer.domElement.addEventListener('pointerdown',onPointerDown);

    state.resizeObserver=new ResizeObserver(resize);
    state.resizeObserver.observe(stage);
    resize();

    state.ready=true;
    setStatus('bereit');
    syncState(true);
    animate(performance.now());
  }

  function setStatus(text){
    const el=document.getElementById('testLab3dStatus');
    if(el) el.textContent=text;
  }

  function resize(){
    if(!state.ready && !state.renderer) return;
    const stage=state.tray?.querySelector('#testLab3dStage');
    if(!stage||!state.renderer||!state.camera) return;
    const w=Math.max(280,stage.clientWidth||600);
    const h=Math.max(220,stage.clientHeight||300);
    state.renderer.setSize(w,h,false);
    state.camera.aspect=w/h;
    state.camera.updateProjectionMatrix();
  }

  function setDesign(design){
    if(!state.ready||design===state.lastDesign) return;
    state.lastDesign=design;
    for(const die of state.dice){
      disposeMaterials(die.materials);
      die.materials=buildMaterials(design);
      die.mesh.material=die.materials;
    }
  }

  const DIE_HALF=.50;
  const FIXED_DT=1/60;
  const SOLVE_STEPS=210;       // 3.5 s simulated time
  const RECORD_EVERY=2;        // 30 fps trajectory
  const MAX_ATTEMPTS_PER_DIE=42;

  function mulberry32(seed){
    let a=seed>>>0;
    return function(){
      a|=0;a=a+0x6D2B79F5|0;
      let t=Math.imul(a^a>>>15,1|a);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }

  function topValueFromQuaternion(q){
    const tq=new THREE.Quaternion(q.x,q.y,q.z,q.w);
    let bestValue=1,bestY=-Infinity;
    for(const [value,normal] of Object.entries(NORMAL_BY_VALUE)){
      const y=normal.clone().applyQuaternion(tq).y;
      if(y>bestY){
        bestY=y;
        bestValue=Number(value);
      }
    }
    return bestValue;
  }

  function targetUpQuaternion(value,rng,tiltMax=.45){
    const normal=NORMAL_BY_VALUE[Number(value)]||NORMAL_BY_VALUE[1];
    const align=new THREE.Quaternion().setFromUnitVectors(normal,new THREE.Vector3(0,1,0));
    const yaw=new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0,1,0),
      rng()*Math.PI*2
    );

    const axis=new THREE.Vector3(rng()-.5,0,rng()-.5);
    if(axis.lengthSq()<.001) axis.set(1,0,0);
    axis.normalize();

    const tilt=new THREE.Quaternion().setFromAxisAngle(
      axis,
      (rng()-.5)*2*tiltMax
    );

    return yaw.multiply(tilt).multiply(align);
  }

  function createSingleDieWorld(){
    const world=new CANNON.World({
      gravity:new CANNON.Vec3(0,-22,0),
      allowSleep:true
    });
    world.broadphase=new CANNON.SAPBroadphase(world);
    world.solver.iterations=12;
    world.solver.tolerance=.001;

    const floorMaterial=new CANNON.Material('tray-solver');
    const diceMaterial=new CANNON.Material('die-solver');

    world.addContactMaterial(new CANNON.ContactMaterial(
      diceMaterial,
      floorMaterial,
      {
        friction:.43,
        restitution:.34,
        contactEquationStiffness:1e8
      }
    ));

    const floor=new CANNON.Body({mass:0,material:floorMaterial});
    floor.addShape(new CANNON.Box(new CANNON.Vec3(5.35,.22,3.35)));
    floor.position.set(0,-1.26,0);
    world.addBody(floor);

    function wall(x,y,z,hx,hy,hz){
      const body=new CANNON.Body({mass:0,material:floorMaterial});
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx,hy,hz)));
      body.position.set(x,y,z);
      world.addBody(body);
    }

    wall(0,-.35,-3.25,5.55,.65,.18);
    wall(0,-.35, 3.25,5.55,.65,.18);
    wall(-5.4,-.35,0,.18,.65,3.25);
    wall( 5.4,-.35,0,.18,.65,3.25);

    const die=new CANNON.Body({
      mass:1,
      material:diceMaterial,
      linearDamping:.08,
      angularDamping:.075,
      allowSleep:true,
      sleepSpeedLimit:.14,
      sleepTimeLimit:.55
    });
    die.addShape(new CANNON.Box(new CANNON.Vec3(DIE_HALF,DIE_HALF,DIE_HALF)));
    world.addBody(die);

    return {world,die};
  }

  function makeCandidate(target,index,seed,safe=false){
    const rng=mulberry32(seed);

    // Five visual lanes across the tray; enough separation to avoid obvious overlaps.
    const laneX=(index-2)*1.72;

    if(safe){
      const q=targetUpQuaternion(target,rng,.025);
      return {
        position:{x:laneX,y:1.72+(index%2)*.12,z:-1.15+(index%2)*1.9},
        velocity:{
          x:(rng()-.5)*.55,
          y:-.35,
          z:.95+rng()*.35
        },
        angularVelocity:{
          x:(rng()<.5?-1:1)*(5.5+rng()*1.6),
          y:(rng()<.5?-1:1)*(3.0+rng()*1.5),
          z:(rng()<.5?-1:1)*(5.2+rng()*1.6)
        },
        quaternion:q
      };
    }

    // Strong enough for visibly ~2–3 tumbles, but not Beyblade territory.
    const q=targetUpQuaternion(target,rng,.5);
    return {
      position:{
        x:laneX+(rng()-.5)*.48,
        y:4.2+rng()*1.6+(index%2)*.18,
        z:-1.65+rng()*.8
      },
      velocity:{
        x:(rng()-.5)*1.7,
        y:-.6-rng()*.8,
        z:3.0+rng()*2.3
      },
      angularVelocity:{
        x:(rng()<.5?-1:1)*(8.0+rng()*4.8),
        y:(rng()<.5?-1:1)*(2.8+rng()*4.0),
        z:(rng()<.5?-1:1)*(7.5+rng()*4.6)
      },
      quaternion:q
    };
  }

  function loadCandidate(body,c){
    body.position.set(c.position.x,c.position.y,c.position.z);
    body.velocity.set(c.velocity.x,c.velocity.y,c.velocity.z);
    body.angularVelocity.set(
      c.angularVelocity.x,
      c.angularVelocity.y,
      c.angularVelocity.z
    );
    body.quaternion.set(
      c.quaternion.x,
      c.quaternion.y,
      c.quaternion.z,
      c.quaternion.w
    );
    body.linearDamping=.08;
    body.angularDamping=.075;
    body.wakeUp();
  }

  function quaternionAngularDistance(a,b){
    const dot=Math.min(
      1,
      Math.abs(a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w)
    );
    return 2*Math.acos(dot);
  }

  function simulateAndRecord(target,index,candidate){
    const {world,die}=createSingleDieWorld();
    loadCandidate(die,candidate);

    const frames=[];
    let previousQ={
      x:die.quaternion.x,y:die.quaternion.y,
      z:die.quaternion.z,w:die.quaternion.w
    };
    let angularTravel=0;
    let bounceHeight=0;
    let groundTouches=0;
    let wasNearGround=false;

    for(let step=0;step<SOLVE_STEPS;step++){
      world.step(FIXED_DT);

      const q={
        x:die.quaternion.x,y:die.quaternion.y,
        z:die.quaternion.z,w:die.quaternion.w
      };
      angularTravel+=quaternionAngularDistance(previousQ,q);
      previousQ=q;

      bounceHeight=Math.max(bounceHeight,die.position.y);

      const nearGround=die.position.y<-.37;
      if(nearGround&&!wasNearGround) groundTouches++;
      wasNearGround=nearGround;

      if(step%RECORD_EVERY===0){
        frames.push({
          x:die.position.x,
          y:die.position.y,
          z:die.position.z,
          qx:die.quaternion.x,
          qy:die.quaternion.y,
          qz:die.quaternion.z,
          qw:die.quaternion.w
        });
      }
    }

    // Final extra frame.
    frames.push({
      x:die.position.x,
      y:die.position.y,
      z:die.position.z,
      qx:die.quaternion.x,
      qy:die.quaternion.y,
      qz:die.quaternion.z,
      qw:die.quaternion.w
    });

    const result=topValueFromQuaternion(die.quaternion);
    const exact=result===Number(target);

    // Visual quality:
    // angularTravel ~ 4π means about two full visible turns.
    const rotations=angularTravel/(Math.PI*2);
    const quality=
      Math.min(rotations,3.5)*6
      +Math.min(groundTouches,4)*2.5
      +Math.min(bounceHeight,6)*.45;

    return {
      exact,
      result,
      frames,
      rotations,
      groundTouches,
      quality
    };
  }

  async function solveOneDie(target,index,token){
    const baseSeed=(
      Date.now()
      ^Math.imul(index+1,0x45D9F3B)
      ^Math.floor(Math.random()*0x7fffffff)
    )>>>0;

    let best=null;

    for(let attempt=0;attempt<MAX_ATTEMPTS_PER_DIE;attempt++){
      if(token!==state.solveToken) return null;

      const seed=(baseSeed+Math.imul(attempt+1,0x9E3779B1))>>>0;
      const candidate=makeCandidate(target,index,seed,false);
      const result=simulateAndRecord(target,index,candidate);

      if(result.exact){
        if(!best||result.quality>best.quality){
          best={
            ...result,
            candidate,
            attempt:attempt+1,
            mode:'searched'
          };
        }

        // Prefer a result that actually tumbles rather than first valid lazy seed.
        if(result.rotations>=1.75 && result.groundTouches>=1 && result.quality>=15){
          break;
        }
      }

      if(attempt%6===5){
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }

    if(best) return best;

    // Reliable physics fallback per die. Still simulated and recorded;
    // no end rotation and no replay physics.
    for(let attempt=0;attempt<18;attempt++){
      if(token!==state.solveToken) return null;

      const seed=(baseSeed+0x85EBCA6B+attempt*113)>>>0;
      const candidate=makeCandidate(target,index,seed,true);
      const result=simulateAndRecord(target,index,candidate);

      if(result.exact){
        return {
          ...result,
          candidate,
          attempt:MAX_ATTEMPTS_PER_DIE+attempt+1,
          mode:'safe'
        };
      }
    }

    return null;
  }

  async function solveSnapshot(snapshot){
    const token=++state.solveToken;
    state.solveRunning=true;
    setStatus('berechnet 5 Trajektorien…');

    const solved=new Array(5).fill(null);

    // Solve one die after another to keep mobile CPU spikes modest.
    for(let i=0;i<snapshot.length;i++){
      if(token!==state.solveToken) return null;
      const d=snapshot[i];

      if(d.locked || d.value==null){
        solved[i]={
          locked:true,
          target:Number(d.value)||1,
          frames:null
        };
        continue;
      }

      setStatus(`Solver ${i+1}/5 · Ziel ${d.value}`);
      const result=await solveOneDie(Number(d.value),i,token);

      if(token!==state.solveToken) return null;
      if(!result){
        console.warn(`[Würfelduell 3D Dice] Kein Pfad für Würfel ${i+1}, Ziel ${d.value}`);
        state.solveRunning=false;
        return null;
      }

      solved[i]={
        locked:false,
        target:Number(d.value),
        frames:result.frames,
        rotations:result.rotations,
        quality:result.quality,
        mode:result.mode
      };
    }

    if(token!==state.solveToken) return null;
    state.solveRunning=false;

    return {
      token,
      snapshot:snapshot.map(d=>({...d})),
      dice:solved
    };
  }

  function stopLivePhysicsForPlayback(snapshot){
    snapshot.forEach((d,i)=>{
      const die=state.dice[i];

      if(d.locked){
        die.body.type=CANNON.Body.STATIC;
        die.body.mass=0;
        die.body.velocity.set(0,0,0);
        die.body.angularVelocity.set(0,0,0);
        die.body.updateMassProperties();
        return;
      }

      // During trajectory playback, cannon-es no longer drives the visible mesh.
      die.body.velocity.set(0,0,0);
      die.body.angularVelocity.set(0,0,0);
      die.body.sleep();
    });
  }

  function startPlayback(solution){
    if(!solution||!state.ready) return;

    stopLivePhysicsForPlayback(solution.snapshot);

    state.playback={
      token:solution.token,
      started:performance.now(),
      frameDuration:(FIXED_DT*RECORD_EVERY)*1000,
      dice:solution.dice,
      done:false
    };

    const safeCount=solution.dice.filter(d=>d&&!d.locked&&d.mode==='safe').length;
    setStatus(safeCount?`spielt Physik · ${safeCount} safe`:'spielt validierte Physik');
  }

  function samplePlayback(now){
    const pb=state.playback;
    if(!pb||pb.done) return false;

    const elapsed=now-pb.started;
    let anyRunning=false;

    pb.dice.forEach((track,i)=>{
      if(!track||track.locked||!track.frames?.length) return;

      const maxIndex=track.frames.length-1;
      const floatIndex=elapsed/pb.frameDuration;
      const index=Math.min(maxIndex,Math.floor(floatIndex));
      const nextIndex=Math.min(maxIndex,index+1);
      const localT=Math.min(1,floatIndex-index);

      const a=track.frames[index];
      const b=track.frames[nextIndex];
      const mesh=state.dice[i].mesh;

      mesh.position.set(
        THREE.MathUtils.lerp(a.x,b.x,localT),
        THREE.MathUtils.lerp(a.y,b.y,localT),
        THREE.MathUtils.lerp(a.z,b.z,localT)
      );

      const qa=new THREE.Quaternion(a.qx,a.qy,a.qz,a.qw);
      const qb=new THREE.Quaternion(b.qx,b.qy,b.qz,b.qw);
      qa.slerp(qb,localT);
      mesh.quaternion.copy(qa);

      if(index<maxIndex) anyRunning=true;
    });

    if(!anyRunning){
      pb.done=true;

      // Freeze physical bodies exactly at the final recorded transforms,
      // so locking after the animation preserves the visible location.
      pb.dice.forEach((track,i)=>{
        if(!track||track.locked||!track.frames?.length) return;
        const f=track.frames[track.frames.length-1];
        const body=state.dice[i].body;

        body.position.set(f.x,f.y,f.z);
        body.quaternion.set(f.qx,f.qy,f.qz,f.qw);
        body.velocity.set(0,0,0);
        body.angularVelocity.set(0,0,0);
        body.sleep();
      });

      setStatus('bereit');
      return false;
    }

    return true;
  }

  async function requestThrow(snapshot){
    if(!state.ready||!state.enabled||!inLab()) return;

    // New roll always wins. This is the key fix for "sometimes no throw".
    state.solveToken++;
    state.queuedSnapshot=snapshot.map(d=>({...d}));

    // Cancel visual playback immediately when a genuinely new result arrives.
    state.playback=null;

    const mySnapshot=state.queuedSnapshot;
    const solution=await solveSnapshot(mySnapshot);

    if(!solution) return;
    if(solution.token!==state.solveToken) return;

    startPlayback(solution);
  }

  function signature(snapshot){
    return snapshot.map(d=>`${d.value??'x'}:${d.locked?1:0}:${d.selected?1:0}:${d.rolling?1:0}`).join('|');
  }

  function syncState(force=false){
    if(!state.ready||!inLab()) return;

    const snap=bridge.snapshot();
    if(!Array.isArray(snap)||snap.length!==5) return;

    setDesign(bridge.diceDesign());

    snap.forEach((d,i)=>{
      const die=state.dice[i];
      die.locked=!!d.locked;
      die.selected=!!d.selected;

      const edgeMat=die.edges.material;
      if(d.locked){
        edgeMat.color.set(0xffd866);
        edgeMat.opacity=.9;
      }else if(d.selected){
        edgeMat.color.set(0x78d8ff);
        edgeMat.opacity=.92;
      }else{
        edgeMat.color.set(0xffffff);
        edgeMat.opacity=.11;
      }

      die.mesh.scale.setScalar(d.selected&&!d.locked?1.055:1);
    });

    const previous=state.lastSnapshot;
    const valuesReady=snap.some(d=>d.value!=null);

    const valueChanged=snap.some((d,i)=>{
      if(d.locked) return false;
      return Number(d.value)!==Number(previous[i]?.value);
    });

    const lockChanged=snap.some((d,i)=>
      !!d.locked!==!!previous[i]?.locked
    );

    const rollFinished=snap.some((d,i)=>
      previous[i]?.rolling && !d.rolling && d.value!=null
    );

    const firstValues=!previous.length&&valuesReady;

    if(
      valuesReady &&
      (
        force ||
        firstValues ||
        rollFinished ||
        valueChanged
      )
    ){
      void requestThrow(snap);
    }else if(lockChanged){
      // Locking alone should not reroll. Just preserve current transforms.
      snap.forEach((d,i)=>{
        if(!d.locked) return;
        const mesh=state.dice[i].mesh;
        const body=state.dice[i].body;
        body.position.copy(mesh.position);
        body.quaternion.copy(mesh.quaternion);
        body.velocity.set(0,0,0);
        body.angularVelocity.set(0,0,0);
        body.type=CANNON.Body.STATIC;
        body.mass=0;
        body.updateMassProperties();
      });
    }

    state.lastSnapshot=snap.map(d=>({...d}));
  }

  function onPointerDown(ev){
    if(!state.enabled||!inLab()) return;
    const rect=state.renderer.domElement.getBoundingClientRect();
    state.pointer.x=((ev.clientX-rect.left)/rect.width)*2-1;
    state.pointer.y=-((ev.clientY-rect.top)/rect.height)*2+1;
    state.raycaster.setFromCamera(state.pointer,state.camera);
    const hits=state.raycaster.intersectObjects(state.dice.map(d=>d.mesh),false);
    if(!hits.length) return;
    const idx=hits[0].object.userData.dieIndex;
    bridge.select(idx);
    setTimeout(()=>syncState(false),0);
  }

  function animate(now){
    state.animationId=requestAnimationFrame(animate);

    if(!state.ready) return;

    if(!inLab()){
      state.tray?.classList.add('hidden');
      return;
    }

    state.tray?.classList.remove('hidden');

    const dt=Math.min(.034,(now-state.lastTime)/1000||.016);
    state.lastTime=now;

    const playing=!!state.playback&&!state.playback.done;

    if(state.enabled){
      if(playing){
        samplePlayback(now);
      }else{
        // Only locked/static dice need their cannon positions mirrored.
        // Unlocked dice stay at their final trajectory transform until next roll.
        state.dice.forEach(die=>{
          if(die.locked){
            die.mesh.position.copy(die.body.position);
            die.mesh.quaternion.copy(die.body.quaternion);
          }
        });
      }
    }

    state.renderer.render(state.scene,state.camera);
  }

  function addWorkbenchControls(){
    const body=document.getElementById('testLabBenchBody');
    if(!body||document.getElementById('testLab3dToggle')) return;

    const wrap=document.createElement('div');
    wrap.className='test-lab-3d-controls';
    wrap.innerHTML=`
      <button type="button" class="secondary" id="testLab3dToggle">🎲 3D Dice Tray: AN</button>
      <button type="button" class="secondary" id="testLab3dThrow">🧪 Physik-Wurf testen</button>
      <button type="button" class="secondary" id="testLab3dLock">🔒 Auswahl locken</button>
      <button type="button" class="secondary" id="testLab3dUnlock">🔓 Locks lösen</button>
      <button type="button" class="secondary" id="testLab3dCheck">✅ Ergebnis prüfen</button>
    `;
    body.appendChild(wrap);

    wrap.querySelector('#testLab3dToggle').addEventListener('click',()=>{
      state.enabled=!state.enabled;
      document.body.classList.toggle('test-lab-dice3d',state.enabled);
      state.tray?.classList.toggle('disabled',!state.enabled);
      wrap.querySelector('#testLab3dToggle').textContent=`🎲 3D Dice Tray: ${state.enabled?'AN':'AUS'}`;
      if(state.enabled){
        syncState(true);
      }
    });

    wrap.querySelector('#testLab3dThrow').addEventListener('click',()=>{
      const snap=bridge.snapshot();
      if(!snap.some(d=>d.value!=null)){
        setStatus('erst normal würfeln');
        setTimeout(()=>setStatus('bereit'),1100);
        return;
      }
      void requestThrow(snap);
    });

    wrap.querySelector('#testLab3dLock').addEventListener('click',()=>{
      if(!bridge.lockSelected()){
        setStatus('erst Würfel auswählen');
        setTimeout(()=>setStatus('bereit'),1100);
      }else{
        setTimeout(()=>syncState(false),0);
      }
    });

    wrap.querySelector('#testLab3dUnlock').addEventListener('click',()=>{
      bridge.clearLocks();
      setTimeout(()=>syncState(false),0);
    });

    wrap.querySelector('#testLab3dCheck').addEventListener('click',()=>{
      const snap=bridge.snapshot();
      const result=state.dice.map((die,i)=>{
        const shown=topValueFromQuaternion(die.mesh.quaternion);
        return `${i+1}:${shown}/${snap[i]?.value??'?'}`;
      }).join(' · ');
      setStatus(result);
      console.info('[Würfelduell 3D Dice] shown/target',result);
      setTimeout(()=>setStatus('bereit'),2600);
    });
  }

  const observer=new MutationObserver(()=>{
    if(!inLab()) return;
    if(!state.ready) init();
    addWorkbenchControls();
    syncState(false);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  const poll=setInterval(()=>{
    if(!inLab()) return;
    if(!state.ready) init();
    addWorkbenchControls();
    syncState(false);
    document.body.classList.toggle('test-lab-dice3d',state.enabled);
  },80);

  // Initialize immediately if the module happens to load while already in the Lab.
  if(inLab()){
    init();
    addWorkbenchControls();
    document.body.classList.add('test-lab-dice3d');
  }
}
