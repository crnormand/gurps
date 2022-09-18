# Migration Notes

## General
- Store all modifiers as flags of various documents for consistency

## Roll Modifiers -> RollModifier
- Previous model seems to just be a string, change to RollModifier interface

## GurpsActor -> StaticCharacterGURPS
- Eliminate "getGurpsActorData()". Seems like a pointless function when one can just target ".system".
- Move "HP", "FP", "QP" to "pools.XX" for consistency
- Move system.conditions.self & system.conditions.target to flags
- system.traits.sizemod should be of type "number" and only signed visually on the charsheet (use "signed" helper)
