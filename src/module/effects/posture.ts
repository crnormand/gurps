export enum PostureType {
  Crawling = 'crawl',
  Crouching = 'crouch',
  Kneeling = 'kneel',
  Prone = 'prone',
  Sitting = 'sit',
  Standing = 'standing',
}

/* ---------------------------------------- */

export function statusIsPosture(status: CONFIG.StatusEffect): boolean {
  const flag = foundry.utils.getProperty(status, 'flags.gurps.effect.type')

  if (flag && flag === 'posture') return true

  return false
}
