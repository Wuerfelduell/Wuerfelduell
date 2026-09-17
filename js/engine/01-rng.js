// Phase 1: Zufallsadapter und flüchtiges Diagnoseprotokoll, noch keine Engine.
(function(root){
  'use strict';
  let source=()=>Math.random(),seed=null,drawIndex=0,visualDepth=0,tape=null,tapeIndex=0;
  let trace=null,active=null;
  const copy=value=>JSON.parse(JSON.stringify(value));
  function random(){
    if(visualDepth)return Math.random();
    const value=source();
    drawIndex++;
    if(active)active.draws.push(value);
    return value;
  }
  function reset(){source=()=>Math.random();seed=null;drawIndex=0;tape=null;tapeIndex=0;trace=null;active=null;}
  function useSeed(value){
    if(!Number.isInteger(value)||value<0||value>0xffffffff)throw new TypeError('Seed muss uint32 sein');
    reset();seed=value;
    // Mulberry32, feste 32-Bit-Operationen; auch Seed 0 ist gültig.
    let state=value>>>0;
    source=()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function useTape(values){
    if(!Array.isArray(values)||values.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>=1))throw new TypeError('Ungültige Zufallsziehungen');
    reset();tape=values.slice();
    source=()=>{if(tapeIndex>=tape.length)throw new Error('Replay-Ziehungen aufgebraucht');return tape[tapeIndex++];};
  }
  function visual(fn){visualDepth++;try{return fn();}finally{visualDepth--;}}
  function startTrace(initial){trace={format:1,seed,initial:copy(initial),entries:[]};active=null;}
  function beginAction(action){
    if(!trace)return;
    active={action:copy(action),draws:[],status:'running'};
    trace.entries.push(active);
  }
  function endAction(status='ok'){if(active)active.status=status;active=null;}
  // Diagnosefehler dürfen eine Online-Aktion niemals blockieren.
  function diagnose(fn){try{return fn();}catch(error){console.warn('Kampfprotokoll nicht verfügbar',error);trace=null;active=null;return null;}}
  root.WDRng=Object.freeze({random,reset,useSeed,useTape,visual,startTrace,beginAction,endAction,diagnose,
    getTrace:()=>trace?copy(trace):null,remaining:()=>tape?tape.length-tapeIndex:null,
    inspect:()=>({seed,drawIndex,recording:!!trace})});
})(globalThis);
