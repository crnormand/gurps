- Extract performAction and actionFuncs from gurps.js and put them an GGA Module
- Make sure that anything that results in a die roll is going via performAction and eliminate all other code paths (i suspect most of them are unused by now)
- Make sure that all actionFuncs store all relevant data in the action object in a standardized way to pass them to downstream processing (doRoll oder rollDamage, tagged Modifier Handling)
- With this standardized data eliminate a lot of special case handling in these downstream functions
- make the Roll Conformation Dialog a full AppV2 and extract it from doRoll and rollDamage. This will enable further enhancement like #2828
- Try to eliminate duplicate logic from doRoll and rollDamage
- Better separation fo roll handling and chat message preparation
- all this in TS 

Research:
doRoll is only called from within gurps.js: in actionFuncs and in handleRoll
rollDamage is only called in actionfucs
handleRoll is only called in resolveDamageRollAction.js
resolveDamageRollAction doesn't seem to by called  anywhere ...

