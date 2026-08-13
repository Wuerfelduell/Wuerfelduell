(function(){
  "use strict";

  function publicProfile(profile){
    if(!profile) return null;
    return {
      id:String(profile.id||""),
      name:String(profile.name||"Spieler").slice(0,24),
      tagNumber:String(profile.tagNumber||"0000").padStart(4,"0").slice(-4),
      selectedDice:String(profile.selectedDice||"classic")
    };
  }

  window.WDOnlineBridge=Object.freeze({
    getProfiles(){
      try{return (saveData?.profiles||[]).map(publicProfile).filter(Boolean);}
      catch(err){console.warn("Online-Profilliste konnte nicht gelesen werden",err);return [];}
    },
    getVersion(){
      try{return String(GAME_VERSION||"");}
      catch(_){return "";}
    }
  });
})();
