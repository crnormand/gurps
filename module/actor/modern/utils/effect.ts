export const isPostureOrManeuver = (effect: ActiveEffect): boolean => {
  const isManeuver = effect.statuses?.has('maneuver')
  const isPosture = effect.flags.gurps?.effect?.type === 'posture'

  return isManeuver || isPosture
}
