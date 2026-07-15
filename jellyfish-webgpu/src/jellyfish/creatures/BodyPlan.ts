/** @deprecated Use CreatureSpec.archetypeId instead for archetype differentiation */
export enum BodyPlan {
  /** Classic medusa: bell + gel overlay + tail + mouth arms + tentacles */
  Medusa = 'medusa',
  /** Ctenophore-ish: lobed/egg body, little/no tentacles */
  CombJelly = 'comb_jelly',
  /** Salp-ish: tubular barrel, minimal appendages */
  Salp = 'salp',
  /** Colony: multiple medusa-like zooids along a chain */
  Siphonophore = 'siphonophore',
  /** Disc Jelly / Moon Jelly: flat disc-shaped bell, short fine tentacles */
  Disc = 'disc',
  /** Box Jelly / Cubozoa: columnar bell, square cross-section, corner tentacles */
  Box = 'box',
  /** Sea Nettle: tall dome bell with long tentacles and frilly oral arms */
  Nettle = 'nettle',
  /** Lobe Jelly / Rhizostome: bilobed egg-shaped bell, oral arms, no marginal tentacles */
  LobeJelly = 'lobe_jelly',
  /** Fish body plan */
  Fish = 'fish',
  /** Sea anemone body plan */
  Anemone = 'anemone',
}

export const CREATURE_ARCHETYPE_BY_BODYPLAN: Record<BodyPlan, string> = {
  [BodyPlan.Medusa]: 'jellyfish',
  [BodyPlan.CombJelly]: 'jellyfish',
  [BodyPlan.Salp]: 'jellyfish',
  [BodyPlan.Siphonophore]: 'jellyfish',
  [BodyPlan.Disc]: 'jellyfish',
  [BodyPlan.Box]: 'jellyfish',
  [BodyPlan.Nettle]: 'jellyfish',
  [BodyPlan.LobeJelly]: 'jellyfish',
  [BodyPlan.Fish]: 'fish',
  [BodyPlan.Anemone]: 'anemone',
};

