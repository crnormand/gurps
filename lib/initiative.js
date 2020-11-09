
/**
 * Override the RollAll method.
 *
 * @returns {Promise<void>}
 */
async function rollAll() {
  const unrolled = this.turns.filter(t => !t.initiative);
  if (!unrolled.length) return;

  await rollGroupInitiative.call(this, unrolled);
}

/**
 * Roll the group initiative
 */
async function rollGroupInitiative(creatures) {
  console.log('group-initiative | Rolling initiative!');

  // Split the combatants in groups based on actor id.
  const groups = creatures.reduce(
    (g, combatant) => ({
      ...g,
      [combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant._id),
    }),
    {}
  );

  // Get first Combatant id for each group
  const ids = Object.keys(groups).map(key => groups[key][0]);

  const messageOptions = {
    flavor: i18n('COMBAT.groupRollsInitiative'),
  };

  // Roll initiative for the group leaders only.
  await this.rollInitiative(ids, {messageOptions});

  // Prepare the others in the group.
  const updates = creatures.reduce((updates, {_id, initiative, actor}) => {
    const group = groups[actor._id];
    if (group.length <= 1 || initiative) return updates;

    // Get initiative from leader of group.
    initiative = this.getCombatant(group[0]).initiative;

    updates.push({_id, initiative});
    return updates;
  }, []);

  // Batch update all other combatants.
  this.updateEmbeddedEntity('Combatant', updates);
}
