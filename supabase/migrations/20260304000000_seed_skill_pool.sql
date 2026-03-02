-- Seed the skill_pool table with all skills
-- This data was previously only in-memory (apps/api/src/db/seed.ts)

INSERT INTO skill_pool (skill_id, name, description, element, type, power, cost, cooldown, effects, rarity_min) VALUES
-- FIRE SKILLS
('sk_inferno_blast', 'Inferno Blast', 'Unleash a massive fireball that engulfs the target.', 'fire', 'attack', 60, 2, 2, '[]', 'common'),
('sk_flame_shield', 'Flame Shield', 'Surround yourself in flames, boosting DEF for 2 turns.', 'fire', 'buff', 0, 1, 3, '[{"type":"def_up","value":0.3,"duration":2}]', 'common'),
('sk_eruption', 'Eruption', 'Volcanic eruption dealing heavy fire damage.', 'fire', 'attack', 80, 3, 3, '[]', 'rare'),
('sk_burn', 'Burn', 'Set the target ablaze, dealing damage over 3 turns.', 'fire', 'attack', 30, 1, 2, '[{"type":"dot","value":10,"duration":3}]', 'common'),
('sk_fire_dance', 'Fire Dance', 'A blazing dance that boosts ATK for 2 turns.', 'fire', 'buff', 0, 1, 3, '[{"type":"atk_up","value":0.25,"duration":2}]', 'common'),
('sk_meteor_strike', 'Meteor Strike', 'Call down a meteor for devastating fire damage.', 'fire', 'attack', 100, 3, 4, '[]', 'epic'),
('sk_blazing_fury', 'Blazing Fury', 'ATK +50% but DEF -20% for 2 turns.', 'fire', 'buff', 0, 2, 4, '[{"type":"atk_up","value":0.5,"duration":2},{"type":"def_down","value":0.2,"duration":2}]', 'rare'),
('sk_ember_shot', 'Ember Shot', 'Quick fire attack with low cost.', 'fire', 'attack', 40, 1, 1, '[]', 'common'),
('sk_wildfire', 'Wildfire', 'Spread fire that reduces enemy DEF.', 'fire', 'attack', 50, 2, 3, '[{"type":"def_down","value":0.2,"duration":2}]', 'rare'),
('sk_phoenix_flame', 'Phoenix Flame', 'Legendary fire that heals self while damaging enemy.', 'fire', 'attack', 70, 3, 4, '[{"type":"lifesteal","value":0.3}]', 'legendary'),

-- WATER SKILLS
('sk_tidal_wave', 'Tidal Wave', 'Crash a massive wave onto the opponent.', 'water', 'attack', 60, 2, 2, '[]', 'common'),
('sk_frost_armor', 'Frost Armor', 'Encase yourself in ice, boosting DEF for 2 turns.', 'water', 'buff', 0, 1, 3, '[{"type":"def_up","value":0.35,"duration":2}]', 'common'),
('sk_healing_rain', 'Healing Rain', 'Gentle rain restores HP.', 'water', 'heal', 40, 2, 3, '[{"type":"heal","value":40}]', 'common'),
('sk_freeze', 'Freeze', 'Freeze the target, reducing SPD for 2 turns.', 'water', 'debuff', 0, 1, 3, '[{"type":"spd_down","value":0.5,"duration":2}]', 'rare'),
('sk_aqua_jet', 'Aqua Jet', 'A quick water strike that hits fast.', 'water', 'attack', 45, 1, 1, '[]', 'common'),
('sk_whirlpool', 'Whirlpool', 'Trap the target in a whirlpool, dealing damage over time.', 'water', 'attack', 35, 2, 3, '[{"type":"dot","value":15,"duration":2}]', 'rare'),
('sk_ice_lance', 'Ice Lance', 'Pierce through defenses with a frozen lance.', 'water', 'attack', 70, 2, 3, '[{"type":"ignore_def","value":0.2}]', 'rare'),
('sk_ocean_blessing', 'Ocean''s Blessing', 'Deep sea magic that heals and boosts DEF.', 'water', 'heal', 30, 2, 4, '[{"type":"heal","value":30},{"type":"def_up","value":0.2,"duration":2}]', 'epic'),
('sk_tsunami', 'Tsunami', 'Unleash the ultimate water devastation.', 'water', 'attack', 95, 3, 4, '[]', 'epic'),
('sk_absolute_zero', 'Absolute Zero', 'Freeze everything. Heavy damage + SPD reduction.', 'water', 'attack', 85, 3, 4, '[{"type":"spd_down","value":0.4,"duration":2}]', 'legendary'),

-- LIGHTNING SKILLS
('sk_thunder_strike', 'Thunder Strike', 'Call down lightning on the target.', 'lightning', 'attack', 55, 2, 2, '[]', 'common'),
('sk_static_field', 'Static Field', 'Generate a static field that reduces enemy ATK.', 'lightning', 'debuff', 0, 1, 3, '[{"type":"atk_down","value":0.25,"duration":2}]', 'common'),
('sk_chain_lightning', 'Chain Lightning', 'Lightning that chains between targets.', 'lightning', 'attack', 65, 2, 2, '[]', 'rare'),
('sk_paralysis', 'Paralysis', 'Shock the target, reducing SPD drastically.', 'lightning', 'debuff', 0, 1, 3, '[{"type":"spd_down","value":0.6,"duration":1}]', 'rare'),
('sk_spark_burst', 'Spark Burst', 'Quick electrical burst.', 'lightning', 'attack', 40, 1, 1, '[]', 'common'),
('sk_overcharge', 'Overcharge', 'Supercharge yourself. ATK and SPD up for 2 turns.', 'lightning', 'buff', 0, 2, 4, '[{"type":"atk_up","value":0.3,"duration":2},{"type":"spd_up","value":0.3,"duration":2}]', 'epic'),
('sk_voltaic_surge', 'Voltaic Surge', 'Surge of electricity piercing through defenses.', 'lightning', 'attack', 75, 2, 3, '[{"type":"ignore_def","value":0.3}]', 'rare'),
('sk_storm_call', 'Storm Call', 'Summon a storm for massive lightning damage.', 'lightning', 'attack', 90, 3, 4, '[]', 'epic'),
('sk_thunder_god', 'Thunder God''s Wrath', 'Channel divine lightning. Ignores 50% DEF.', 'lightning', 'attack', 100, 3, 4, '[{"type":"ignore_def","value":0.5}]', 'legendary'),

-- NATURE SKILLS
('sk_vine_whip', 'Vine Whip', 'Strike with thorny vines.', 'nature', 'attack', 50, 1, 1, '[]', 'common'),
('sk_regeneration', 'Regeneration', 'Heal over time for 3 turns.', 'nature', 'heal', 0, 1, 3, '[{"type":"hot","value":15,"duration":3}]', 'common'),
('sk_poison_spore', 'Poison Spore', 'Release toxic spores that poison the target.', 'nature', 'attack', 25, 1, 2, '[{"type":"dot","value":12,"duration":3}]', 'common'),
('sk_root', 'Root', 'Entangle the target with roots, reducing SPD.', 'nature', 'debuff', 0, 1, 3, '[{"type":"spd_down","value":0.4,"duration":2}]', 'common'),
('sk_thorn_barrage', 'Thorn Barrage', 'Barrage of thorns dealing solid damage.', 'nature', 'attack', 60, 2, 2, '[]', 'rare'),
('sk_natures_wrath', 'Nature''s Wrath', 'The fury of nature unleashed.', 'nature', 'attack', 85, 3, 3, '[]', 'epic'),
('sk_bloom', 'Bloom', 'Full heal burst from nature''s energy.', 'nature', 'heal', 60, 2, 4, '[{"type":"heal","value":60}]', 'rare'),
('sk_photosynthesis', 'Photosynthesis', 'Absorb light to heal and boost DEF.', 'nature', 'heal', 25, 1, 3, '[{"type":"heal","value":25},{"type":"def_up","value":0.15,"duration":2}]', 'common'),
('sk_world_tree', 'World Tree''s Blessing', 'Legendary nature magic. Massive heal + ATK buff.', 'nature', 'heal', 80, 3, 4, '[{"type":"heal","value":80},{"type":"atk_up","value":0.3,"duration":2}]', 'legendary'),

-- SHADOW SKILLS
('sk_phantom_strike', 'Phantom Strike', 'Shadow attack that ignores 30% of DEF.', 'shadow', 'attack', 65, 2, 2, '[{"type":"ignore_def","value":0.3}]', 'common'),
('sk_dark_veil', 'Dark Veil', 'Cloak in shadows, boosting evasion for 1 turn.', 'shadow', 'buff', 0, 1, 3, '[{"type":"evasion_up","value":0.5,"duration":1}]', 'common'),
('sk_soul_drain', 'Soul Drain', 'Drain the target''s life force. Lifesteal attack.', 'shadow', 'attack', 50, 2, 3, '[{"type":"lifesteal","value":0.4}]', 'rare'),
('sk_curse', 'Curse', 'Place a dark curse, reducing ATK for 2 turns.', 'shadow', 'debuff', 0, 1, 3, '[{"type":"atk_down","value":0.3,"duration":2}]', 'common'),
('sk_shadow_bolt', 'Shadow Bolt', 'Quick bolt of dark energy.', 'shadow', 'attack', 45, 1, 1, '[]', 'common'),
('sk_nightmare', 'Nightmare', 'Inflict nightmares, reducing all stats.', 'shadow', 'debuff', 0, 2, 4, '[{"type":"atk_down","value":0.2,"duration":2},{"type":"def_down","value":0.2,"duration":2}]', 'epic'),
('sk_void_slash', 'Void Slash', 'Slash through the void dealing heavy shadow damage.', 'shadow', 'attack', 80, 2, 3, '[]', 'rare'),
('sk_death_mark', 'Death Mark', 'Mark the target for death. Extra damage on next attack.', 'shadow', 'debuff', 0, 1, 4, '[{"type":"damage_taken_up","value":0.4,"duration":1}]', 'epic'),
('sk_abyss', 'Abyss', 'Open the abyss. Devastating shadow damage.', 'shadow', 'attack', 100, 3, 4, '[]', 'legendary'),

-- LIGHT SKILLS
('sk_holy_smite', 'Holy Smite', 'Strike with divine light.', 'light', 'attack', 55, 2, 2, '[]', 'common'),
('sk_divine_shield', 'Divine Shield', 'Summon a shield of light. DEF +40% for 2 turns.', 'light', 'buff', 0, 2, 3, '[{"type":"def_up","value":0.4,"duration":2}]', 'rare'),
('sk_purify', 'Purify', 'Cleanse all debuffs and heal slightly.', 'light', 'heal', 20, 1, 3, '[{"type":"cleanse","value":1},{"type":"heal","value":20}]', 'common'),
('sk_blind', 'Blind', 'Blind the target with radiant light. ATK down.', 'light', 'debuff', 0, 1, 3, '[{"type":"atk_down","value":0.35,"duration":2}]', 'common'),
('sk_radiant_beam', 'Radiant Beam', 'A focused beam of pure light.', 'light', 'attack', 65, 2, 2, '[]', 'rare'),
('sk_sanctuary', 'Sanctuary', 'Create a holy sanctuary. Heal + DEF up.', 'light', 'heal', 35, 2, 4, '[{"type":"heal","value":35},{"type":"def_up","value":0.25,"duration":2}]', 'rare'),
('sk_ray_of_light', 'Ray of Light', 'Quick light attack.', 'light', 'attack', 40, 1, 1, '[]', 'common'),
('sk_judgment', 'Judgment', 'Pass divine judgment dealing massive light damage.', 'light', 'attack', 90, 3, 4, '[]', 'epic'),
('sk_divine_wrath', 'Divine Wrath', 'The wrath of the heavens. Ignores DEF entirely.', 'light', 'attack', 80, 3, 4, '[{"type":"ignore_def","value":1.0}]', 'legendary'),

-- UNIVERSAL SKILLS
('sk_last_stand', 'Last Stand', 'When HP below 20%, ATK doubles for 1 turn.', NULL, 'buff', 0, 1, 4, '[{"type":"last_stand","value":2.0,"duration":1}]', 'epic'),
('sk_mirror', 'Mirror', 'Reflect 50% of received damage for 1 turn.', NULL, 'buff', 0, 2, 4, '[{"type":"reflect","value":0.5,"duration":1}]', 'epic'),
('sk_sacrifice', 'Sacrifice', 'Sacrifice 30% HP to deal fixed 100 damage.', NULL, 'special', 100, 2, 4, '[{"type":"self_damage_percent","value":0.3}]', 'rare'),
('sk_swap', 'Swap', 'Exchange ATK and DEF with the opponent for 2 turns.', NULL, 'special', 0, 2, 4, '[{"type":"swap_stats","value":1,"duration":2}]', 'legendary')
ON CONFLICT (skill_id) DO NOTHING;
