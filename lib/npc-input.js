'use strict'

import { GURPS } from "../module/gurps.js";
import { GurpsActor, Advantage, Skill, Melee, Ranged, HitLocation, Encumbrance, Note } from "../module/actor.js";
import { digitsAndDecimalOnly, digitsOnly } from './jquery-helper.js'

Hooks.on(`renderNpcInput`, (app, html, data) => {
  $(html).find("#npc-input-name").focus();
});

Hooks.once("ready", () => { new NpcInput().render(true) });

let EX = [
	`ST: 13 HP: 13 Speed: 5.00
DX: 11 Will: 9 Move: 5
IQ: 9 Per: 12
HT: 11 FP: 11 SM: 0
Dodge: 8 Parry: 9 DR: 1
Kick (11): 1d+1 crushing. Reach C, 1.
Punch (13): 1d crushing. Reach C.
Stone-Headed Club (12): 2d+3 crushing. Reach 1.
Traits: Animal Empathy; Appearance (Unattractive); Arm ST
1; Brachiator (Move 3); Social Stigma (Savage); Temperature
Tolerance 2 (Cold).
Skills: Axe/Mace-12; Brawling-13; Camouflage-12; Climbing-
13; Stealth-12; Tracking-12; Wrestling-12.
Class: Mundane.
Notes: Effective ST 15 when grappling, thanks to Arm ST
and Wrestling. These stats represent a wildman; females
are'nt often warriors, and have ST 12 (and lower damage),
DX 10, HP 12, and reduced combat skills, but superior
Camouflage and Stealth, and a tendency to climb up high
and pelt foes with large stones (Throwing-12, 1d-2 crushing)
to support their males and guard beasts. A wildman
generally carries a stone-tipped club (treat as a mace)
and wears hides (DR 1, included above); more advanced
gear is extremely unlikely, and wildman conscripts given
such equipment never get used to it: .2 to combat skills.
Spellcasters are always shamans with IQ 10+, Power Investiture
1-3, and druidic spells. Wildmen will negotiate with
anyone who hasn't violated one of their taboos.
`,
`ST: 23 HP: 23 Speed: 6.50
DX: 14 Will: 13 Move: 10 (Air Move 13)
IQ: 5 Per: 12
HT: 12 FP: 12 SM: +1
Dodge: 10 Parry: 12 (¾2) DR: 2
Dragon's Head (16): Bite or horns, 2d+2 cutting. Horns count
as weapon, not as body part, both to attack and parry!
Reach C, 1.
Fire Breath (16): 2d+1 burning in a 1-yard-wide ¾ 10-yardlong
cone that inflicts large-area injury (Exploits, p. 53);
see Area and Spreading Attacks (Exploits, pp. 45-46). Costs
2 FP per use, with no recharge time or limit on uses/day.
Front Claw (16): 2d+2 cutting. Reach C, 1.
Goat's Head (16): Horns, 2d+2 impaling. Treat as weapon,
not as body part, both to attack and parry! Reach C, 1.
Hind Claw (14): 2d+3 cutting. Reach C, 1.
Lion's Head (16): Bite, 2d+2 cutting. Reach C, 1.
Serpent's Head (16): Bite (at only ST 18), 1d+2 impaling +
follow-up 2d toxic, or 1d with a successful HT roll. Reach
C, 1.
Traits: 360ø Vision; Bad Temper (9); Combat Reflexes; DR
2 vs. heat/fire only; Extra Attack 3; Extra-Flexible; Extra
Heads 3; Flight (Winged); Night Vision 5; Penetrating
Voice; Quadruped; Temperature Tolerance 2 (Heat); Wild
Animal.
Skills: Brawling-16; Innate Attack (Breath)-16.
`,
`ST: 13 HP: 17 Speed: 6.00
DX: 12 Will: 8 Move: 4
IQ: 8 Per: 8
HT: 12 FP: N/A SM: 0
Dodge: 8 Parry/Block: 9 DR: 2
Punch (13): 1d-1 crushing. Reach C.
Shield Bash (13): 1d crushing. Reach 1.
Weapon (12 or 13): Axe (2d+1 cutting), broadsword (2d cutting
or 1d+2 impaling), mace (2d+2 crushing), morningstar
(2d+2 crushing), etc. Reach 1.
Traits: Appearance (Monstrous); Automaton; Bad Smell;
Cannot Learn; Dependency (Loses 1 HP per minute in
no-mana areas); Disturbing Voice; Doesnüft Breathe;
Doesnüft Eat or Drink; Doesnüft Sleep; High Pain Threshold;
Immunity to Disease; Immunity to Mind Control;
Immunity to Poison; Indomitable; No Blood; No Sense of
Smell/Taste; Reprogrammable; Single-Minded; Temperature
Tolerance 5 (Cold); Temperature Tolerance 5 (Heat);
Unfazeable; Unhealing (Total); Unliving; Unnatural.
Skills: Brawling-13; Shield-13; Wrestling-13; one of
Axe/Mace.13, Broadsword-13, or Flail-12.
Class: Undead.
Notes: Unaffected by Death Vision or Sense Life, but susceptible
to Pentagram, Sense Spirit, and Turn Zombie. Effective
grappling ST is 14, thanks to Wrestling. This zombie is
made from a beefy gang enforcer, foot soldier, or similar
melee fighter, and equipped as a bargain-basement shock
trooper: one-handed melee weapon, medium shield (DB
2), and heavy leather armor (DR 2, included above). This
results in Light encumbrance, which is already figured into
the stats. Zombies will rot, eventually becoming skeletons
(pp. 47-48) if they last long enough . though some are preserved
as mummies with IQ 10, No Brain, and No Vitals,
but which catch fire and burn for 1d-1 injury per second if
they receive a major wound from fire. Not truly evil, though
the magic animating it usually is. No undead servitor will
negotiate or reveal useful information.

`,
`ST: 18 HP: 18 Speed: 6.00
DX: 12 Will: 10 Move: 9
IQ: 10 Per: 11
HT: 12 FP: 12 SM: 0
Dodge: 10 Parry: 11 (unarmed) DR: 15 (not vs. silver)
Bite or Claw (14): 2d+1 cutting. Reach C.
Traits: Acute Hearing 3; Acute Taste and Smell 3; Alternate
Form (Human); Appearance (Hideous); Bloodlust
(12); Combat Reflexes; Discriminatory Smell; Disturbing
Voice; Dread (Wolfsbane; 1 yard); Gluttony (12); High
Pain Threshold; Immunity to Disease; Immunity to Poison;
Night Vision 2; No Fine Manipulators; Odious Racial
Habit (Eats other sapient beings, .3 reactions); Penetrating
Voice; Recovery; Regeneration (1 HP/second, but not vs.
damage from silver); Silence 1; Striking ST 4; Temperature
Tolerance 5 (Cold); Vulnerability (Silver).
Skills: Brawling-14; Stealth-12 (13 vs. Hearing if moving, 14 if
motionless); Tracking-15.
Class: Mundane.
Notes: Hearing roll is 14 and Smell roll is 18 for detecting
delvers! Individuals may be bigger (more ST, HP, and
Striking ST), sneakier (higher Night Vision and Silence), or
more skilled. Clawed hands prevent weapon use. Against a
group carrying wolfsbane and bristling with silver weapons,
werewolves will stay hidden or pretend to be human .
but if they canüft, theyüfll negotiate. Truly evil.


`,
`ST: 15 HP: 15 Speed: 8.00
DX: 18 Will: 15 Move: 8
IQ: 12 Per: 15 Weight: 100.150 lbs.
HT: 13 FP: 13 SM: 0
Dodge: 12 Parry: 14 DR: 2 (Tough Skin)
Fright Check: -4 (once maw is open)
Bite (20): 3d+1 cutting. Often aimed at the neck; see text. May
bite and use webbing on the same turn. Reach C.
Punch (20): 1d+1 crushing. Reach C.
Webbing (20): Binding ST 25 (p. B40) with Engulfing and
Sticky. Range 50, Acc 3, RoF 10, Rcl 1. The rate of fire may
be split up among multiple foes; e.g., three strands at the
commando, three at the sage, and four
at the warrior, resolved as three separate
attacks.
Traits: Ambidexterity; Appearance
(Beautiful); Clinging;
Combat Reflexes; Danger
Sense; Extra Attack (see Webbing,
above); Honest Face;
Infravision; Injury Tolerance
(No Brain; No Vitals; Unliving;
see notes); Restricted Diet
(People); Striking ST 12 (Bite
Only; Nuisance Effect, Hideous
Appearance); Subsonic
Hearing; Super Jump 2.
Skills: Acrobatics.18; Acting.14;
Brawling.20; Innate Attack
(Projectile).20; Musical Instrument
(varies).12; Jumping.20;
Sex Appeal.15; Singing.14;
Stealth.20.
Notes: Living being!  gUnliving h
simply reflects its odd physiology.
As well, it has a brain
and vitals, but not where
you fd expect; knowing where
to stab requires a successful
roll against Biology at -4,
Hidden Lore (Cryptozoology),
Theology (Shamanic) at -2, or
Veterinary. In combat, can
leap 11 yards forward or three
yards straight up; double this
out of combat, double it with
a running start, quadruple it
for both.
`,
`Guards
ST 10; DX 10; IQ 9; HT 11.
Damage 1d-2/1d; BL 20 lbs.; HP 10; Will 9; Per 10; FP 11.
Basic Speed 5.25; Basic Move 5; Dodge 8; Parry 9 (Brawling).
5Æ6ö-6Æ; 150-170 lbs.
Advantages/Disadvantages: Cantonese (Native).
Skills: Brawling-13; Guns/TL8 (Pistol)-12; Guns/TL8
(SMG)-12; Knife-14.
`,
`The Mate
ST 11; DX 12; IQ 10; HT 11.
Damage 1d-1/1d+1; BL 24 lbs.; HP 11; Will 10; Per 12; FP 11.
Basic Speed 5.75; Basic Move 5; Dodge 9; Parry 10 (Knife).
5Æ8ö; 155 lbs.
Advantages/Disadvantages: Acute Hearing 2; Cantonese
(Native); Combat Reflexes.
Skills: Brawling-14; Guns/TL8 (Pistol)-14; Guns/TL8
(SMG)-14; Knife-15.
`,
`The Fat Man is morbidly obese, bald, and has a sallow complexion
that makes him look very faintly East Asian. He has
extremely pale gray-green eyes. He wears a chartreuse jumpsuit
with a belt festooned with gadgets (hence the Gizmo advantage).
He is unarmed, trusting in his teleport discs to get him
away and his loyal minions to cover his escape, if necessary.
Note to the GM: This is the  secretly an alien  version of the
Fat Man. His traits will need to be adjusted if you choose
another explanation for his
actions in this adventure. Also,
there is considerable room for
expansion in this write-up; the
Fat Man could easily be a 300- or
even 350-point adversary for the
UNISTOMP team. In particular,
with his IQ and Language Talent,
the GM can easily justify giving
him any language spoken by the
agents in this adventure. (The
Fat Man could also have some
sort of superscience universal
translator, but that's so much less
impressive . . .)
ST 14 [40]; DX 10 [0]; IQ 17
[140]; HT 11 [10].
Damage 1d/2d; BL 39 lbs.; HP 14
[0]; Will 17 [0]; Per 17 [0]; FP
11 [0].
Basic Speed 5.25 [0]; Basic Move
5 [0]; Dodge 8.
Social Background
TL: 9 [5].
CF: Alien Homeland [0];
Communist Bloc [2]; Western
Bloc [2].
Languages:* Cantonese
(Native) [4]; English (Native) [4];
Japanese (Native) [4]; Russian (Native) [4]; Swahili (Native)
[4].
Advantages
Charisma 1 [5]; DR 10 (Force Field, +20%) [60]; Gizmos 1
[5]; Language Talent [10]; Social Regard 1 (Terrorist mastermind;
Feared) [5]; Unusual Background (Alien) [20]; Versatile
[5].
Disadvantages
Dependent (Sorra Lee; 0 or fewer points; Loved One; 15 or
less) [-90]; Gluttony (12) [-5]; Overconfidence (12) [-5]; Secret
(Alien; Possible Death) [-30]; Very Fat [-5].
Quirks: Taunts his victims incessantly. [-1]
Skills
Beam Weapons/TL9 (Pistol) (E) DX+3
[8]-13; Brainwashing/TL9 (H) IQ+2 [12]-19;
Brawling (E) DX+3 [8]-13; Computer Operation/
TL9 (E) IQ [1]-17; Computer Programming/
TL9 (H) IQ-2 [1]-15; Electronics
Operation/TL9 (Comm) (A) IQ-1 [1]-16; Electronics
Operation/TL9 (Force Shields) (A)
IQ-1 [1]-16; Electronics Operation/TL9 (Matter
Transmitters) (A) IQ-1 [1]-16; Electronics
Operation/TL9 (Sensors) (A) IQ-1 [1]-16;
Engineer/TL9 (Electronics) (H) IQ-2 [1]-15;
Geography/TL8 (Cold War Political) (H) IQ
[4]-17; Guns/TL8 (Pistol) (E) DX+1 [2]-11;
Guns/TL8 (SMG) (E) DX [1]-10; Liquid Projector/
TL8 (Flamethrower) (E) DX [1]-10;
Mathematics/TL9 (Applied) (H) IQ-2 [1]-15;
Navigation/TL9 (Sea) (A) IQ-1 [1]-16; Navigation
(Space) (A) IQ-1 [1]-16; Psychology (H)
IQ-2 [1]-15; Submarine/TL8 (Mini-Sub) (A)
DX+2 [8]-12; Tactics (H) IQ-2 [1]-15;
Traps/TL9 (A) IQ-1 [1]-16.`,

`Notwithstanding the page name, this guy is not a Nazi party member. He's just a German soldier in 1939. His main motivation is the same as that of many young men like him in his day, patriotism.
This is a very generic German infantryman, with no special personal Traits, save the most common ones.
His Attributes and Skills reflect the fact that in 1939, the average soldier was pretty thoroughly trained and physically conditioned; also, he belongs to a first-class division, in which most privates would be young, healthy and bright for their age.
Height: 5'11", weight: 155 lbs., age: 21.
ST: 11 	HP: 11 	Speed: 5.5
DX: 11 	Will: 11 	Move: 4
IQ: 11 	Per: 11 	
HT: 11 	FP: 11 	SM: 0
Dodge: 7 	Parry: 8 	DR: 4,0,2

Mauser Karabiner 98K 7.92mm Mauser (13): 7d pi
Bayonet, Fine (7): 1d cut, Reach C,1; 1d imp, Reach C
Rifle-fixed bayonet thrust (10): 1d+3 imp, Reach 1,2*
Straight rifle-butt thrust (8): 1d+1 cr, Reach 1
Punch (12): 1d-2 cr, Reach C
Kick (10): 1d cr, Reach C,1

Traits: Addiction (Tobacco); Duty (Heer; 15 or less; Extremely Hazardous); Fanaticism (Patriotism); Fit.
Skills: Armoury/TL6 (Small Arms)-10; Brawling-12; Camouflage-11; Climibing-10; Explosives/TL6 (Demolition)-10; First Aid/TL6-11; Gambling-10; Gunner/TL6 (Machine Gun)-11; Guns/TL6 (Light Machine Gun)-12; Guns/TL6 (Rifle)-13; Hiking-10; Jumping-11; Navigation/TL6 (Land)-10; Savoir-Faire (Military)-11; Scrounging-11; Soldier/TL6-12; Spear-10; Stealth-10; Survival (Woodlands)-10; Swimming-11; Teamster (Equines)-10; Throwing-10; Traps/TL6-10.
`
]


export class NpcInput extends Application {
	
  constructor(actor, options = {}) {
	  super(options);
		this.mook = new Mook();
  }
	
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['npc-input', 'sheet', 'actor'],
      id: 'npc-input',
      template: 'systems/gurps/templates/npc-input.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: 700,
      title: 'Mook Generator'
    });
  }	
	getData(options) {
		let data = super.getData(options);
		data.mook = this.mook;
		return data;
	}

	activateListeners(html) {
	  super.activateListeners(html);
 
    html.find(".gcs-input-sm2").inputFilter(value => digitsOnly.test(value))
  	html.find('input[type=text]').on('change paste keyup', (ev) => {
      let el = ev.currentTarget;
  		let k = el.dataset.key;
  		if (!!k) this.mook[k] = el.value;
     })
	
	   html.find('.npc-input-ta').on('change', (ev) => {
      let el = ev.currentTarget;
      let k = el.dataset.key;
      if (!!k) this.mook[k] = el.value;
     })

    html.find('#npc-input-create').on('click keydown focusout', (ev) => {
      if (ev.type == 'click' || (ev.type == 'keydown' && ev.which == 13))
        this.createMook(ev);
      else {
	      ev.preventDefault();
        $(html).find("#npc-input-name").focus();
      }
    });
  }

  // return an array of string representing each line
  prep(text, delim) {
    if (!!delim) {
      const regex = new RegExp(delim, "g");
      text = text.replace(regex, "\n");
    }
    let ans = text.split("\n");
    return ans.map(e => e.trim()).filter(e => e.length > 0);
	}

  // This does all the work ;-)
  async createMook(ev) {
		ev.preventDefault();
	  if (ev.shiftKey) this.parseStatBlock(EX[0]);

    if (this.check()) {
	    let data = { name: this.mook.name, type: "character" };
	    let a = await GurpsActor.create(data, {renderSheet: false});
      await this.populate(a);
      await a.setFlag("core", "sheetClass", "gurps.GurpsActorNpcSheet");
      a.sheet.render(true);
	  } else
      ui.notifications.warn("Unable to create Mook");
    this.render(true);
	}
	
	async populate(a) {
		let m = this.mook;
		let data = a.data.data;
    let att = data.attributes;
    att.ST.value = m.st;
    att.DX.value = m.dx;
    att.IQ.value = m.iq;
    att.HT.value = m.ht;
    att.WILL.value = m.will;
    att.PER.value = m.per;
   
    data.HP.max = m.hp;
    data.HP.value = m.hp;
    data.FP.max = m.fp;
    data.FP.value = m.fp;
    
    data.basicmove.value = m.move;
    data.basicspeed.value = m.speed;
    data.currentmove = m.move;
    data.frightcheck = m.will;

    data.hearing = m.per;
    data.tastesmell = m.per;
    data.touch = m.per;
    data.vision = m.per;

    let ns = {};
    let nt = new Note(m.notes);
    GURPS.put(ns, nt);

    let hls = data.hitlocations;
    let hl = Object.values(hls).find(h => h.penalty == 0);
    hl.dr = m.dr;

    let es = {};
    let e = new Encumbrance();
    e.level = 0;
    e.current = true;
    e.key = "enc0";
    e.move = m.move;
    e.dodge = m.dodge;
    game.GURPS.put(es, e);


    let melee = {};
    m.a_melee.forEach(me => game.GURPS.put(melee, me));

    let ranged = {};
    m.a_ranged.forEach(r => game.GURPS.put(ranged, r));
   
    let ts = {};
    ts.title = m.title;
    let dt = (new Date()).toString().split(' ').splice(1,3).join(' ');
    ts.createdon = dt;
//    ts.modifiedon = dt;
    if (!!m.sm) ts.sizemod = (m.sm[0] == "-") ? m.sm : "+" + m.sm;
    ts.appearance = m.desc;

    let skills = {};
    m.a_skills.forEach(s => game.GURPS.put(skills, s));

    let ads = {};
    m.a_traits.forEach(a => game.GURPS.put(ads, a));

    let commit =  {
      "data.attributes": att,
      "data.HP": data.HP,
      "data.FP": data.FP,
      "data.basicmove": data.basicmove,
      "data.basicspeed": data.basicspeed,
      "data.currentmove": data.currentmove,
      "data.frightcheck": data.frightcheck,
      "data.hearing": data.hearing,
      "data.tastesmell": data.tastesmell,
      "data.touch": data.touch,
      "data.vision": data.vision,
      "data.notes": ns,
      "data.hitlocations": hls,
      "data.encumbrance": es,
      "data.melee": melee,
      "data.ranged": ranged,
      "data.traits": ts,
      "data.skills": skills,
      "data.ads": ads,
   };

    await a.update(commit);
    console.log("Created Mook:");  
    console.log(a);
	}

  check() {
	  let error = !this.mook.name;
    error = this.checkTraits() || error;
	  error = this.checkSkills() || error;
    error = this.checkMelee() || error;
    error = this.checkRanged() || error;
    return !error;
	}
	
	checkSkills() {
  	const m = this.mook;
    const err = "Error:";
    let txt = "";
    let arr = [];
  	this.prep(m.skills, ",").forEach(e => { 
	    if (e.includes(err)) return txt += "\n" + e;
 			if (e.startsWith(":")) {
				if (arr.length == 0) return txt += `\n${e} ${err} Invalid comment.   Comments cannot be first`;
				arr[arr.length-1].notes = e.substr(1);
				return;
			}
  		const i = e.indexOf("-");
  		if (i < 1) return txt += `\n${e} ${err} missing '-'`;
  		const n = e.substring(0, i).trim();
  		const v = e.substr(i+1).trim();
      if (!v) return txt += `\n${e} ${err} missing skill level`;
  		if (isNaN(v)) return txt += `\n${e} ${err} "${v}" is not a number`;
  	  txt += "\n" + e;
      arr.push(new Skill(n, v));
    });
    m.skills = txt.substr(1);
    m.a_skills = arr;
    return txt.includes(err);
  }

  checkMelee() {
    const pats = [
      { regex: "(^usage|^Usage|^mode|^Mode)\\w+", var: "mode" },
      { regex: "(^parry|^Parry)\\d+", var: "parry" },
      { regex: "(^reach|^Reach)[\\w,]+", var: "reach" },
      { regex: "(^st|^ST|^St)\\d+", var: "st" },
      { regex: "(^block|^Block)\\d+", var: "block" }
    ];
    const m = this.mook;
    const err = "Error:";
    let txt = [];
    let arr = [];
    this.prep(m.melee).forEach(e => { 
      if (e.includes(err)) return txt += "\n" + e;
 			if (e.startsWith(":")) {
				if (arr.length == 0) return txt += `\n${e} ${err} Invalid comment.   Comments cannot be first`;
				arr[arr.length-1].notes = e.substr(1);
				return;
			}
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)$/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${e} ${err} unable to parse (level) and damage`;
      parse = parse.split("~");
      let me = new Melee(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + " " + parse[7]);
      if (!!parse[8]) {
        let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
        if (ext.length % 2 != 0) return txt += `\n${e} ${err} unable to parse "${parse[8]}"`;
        for (let i = 0; i < ext.length; i += 2) {
          let s = ext[i] + ext[i+1];
          let found = false;
          pats.forEach(p => {
             if (s.match(new RegExp(p.regex))) {
  	           me[p.var] = ext[i+1];
               found = true;
             }
          });
          if (!found) return txt += `\n${e} ${err} unknown pattern "${ext[i]} ${ext[i+1]}"`;
        }
      }
      arr.push(me);
      txt += "\n" + e;    
    });
    m.melee = txt.substr(1);
    m.a_melee = arr;
    return txt.includes(err);
  }

  checkRanged() {
	  const pats = [
      { regex: "(^acc|^Acc)\\d+", var: "acc" },
      { regex: "(^rof|^RoF|^Rof)\\d+", var: "rof" },
      { regex: "(^rcl|^Rcl)\\d+", var: "rcl" },
      { regex: "(^usage|^Usage|^mode|^Mode)\\w+", var: "mode" },
      { regex: "(^range|^Range)\\d+(\\/\\d+)?", var: "range" },
      { regex: "(^shots|^Shots)[\\w\\)\\(]+", var: "shots" },
      { regex: "(^bulk|^Bulk)[\\w-]+", var: "bulk" },
      { regex: "(^st|^ST|^St)\\d+", var: "st" },
    ];
    const m = this.mook;
    const err = "Error:";
    let txt = [];
    let arr = [];
    this.prep(m.ranged).forEach(e => { 
      if (e.includes(err)) return txt += "\n" + e;
 			if (e.startsWith(":")) {
				if (arr.length == 0) return txt += `\n${e} ${err} Invalid comment.   Comments cannot be first`;
				arr[arr.length-1].notes = e.substr(1);
				return;
			}
     let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${e} ${err} unable to parse (level) and damage`;
      parse = parse.split("~");
      let r = new Ranged(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + " " + parse[7]);
      if (!!parse[8]) {
        let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
        if (ext.length % 2 != 0) return txt += `\n${e} ${err} unable to parse "${parse[8]}"`;
        for (let i = 0; i < ext.length; i += 2) {
  	      let s = ext[i] + ext[i+1];
          let found = false;
          pats.forEach(p => {
  	         if (s.match(new RegExp(p.regex))) {
               r[p.var] = ext[i+1];
               found = true;
             }
  	      });
          if (!found) return txt += `\n${e} ${err} unknown pattern "${ext[i]} ${ext[i+1]}"`;
  	    }
      }
      txt += "\n" + e;    
      arr.push(r);
    });
    m.ranged = txt.substr(1);
    m.a_ranged = arr;
    return txt.includes(err);
  }


  checkTraits() {
    const m = this.mook;
    let txt = [];
    let arr = [];
    this.prep(m.traits, ";").forEach(e => { 
 			if (e.startsWith(":")) {
				if (arr.length == 0) return txt += `\n${e} ${err} Invalid comment.   Comments cannot be first`;
				arr[arr.length-1].notes = e.substr(1);
				return;
			}
      arr.push(new Advantage(e));
      txt += "\n" + e;
    });
    m.traits = txt.substr(1);
    m.a_traits = arr;
    return false;
  }

  parseStatBlock(txt) {
	  this.statblk = txt.replace(/ +/g, " ");  

		try {
    	let next = this.parseAttrs();
			next = this.parseAttacks(next);
			
		} catch (e) {
			console.log(e);
			ui.notifications.warn(e);
		}
			
	}
	
	getAttrib(t) {
		return t.substring(0, t.length - 1);	
	}
	
	storeAttrib(attrib, value) {
		this.mook[attrib.toLowerCase()] = value;		
	}
	
	parseAttacks(last) {
		this.mook.melee = "";
		let meleeblk = this.nextToken("Traits:", false);
		if (!meleeblk) throw "Unable to find 'Traits:' after Attribute block";
		meleeblk = last + " " + meleeblk;
		// assume each attack is on its own line, and return the last line if no match
		var line;
		[meleeblk, line] = this.nextTokenPrim(meleeblk, "\n", false, true);	
		while (!!line) {
			var name, lvlv, dmg
			[line, name] = this.nextTokenPrim(line, "(", false);	
			[line, lvl] = this.nextTokenPrim(line, ")", "):");	
			[line, dmg] = this.nextTokenPrim(line, ".", ",", true);		// find up to . or , or end of string	
			[meleeblk, line] = this.nextTokenPrim(meleeblk, "\n", false, true);	
		}
		
	}
	
	parseAttrs() {
		let t = this.nextToken();
		while(t.endsWith(":")) {
			let attr = this.getAttrib(t);
			let v = this.nextToken();
			this.storeAttrib(attr, v);
			t = this.nextToken();
		}
		return t;
	}
	
	nextToken(d1 = " ", d2 = "\n") {
		let [s, t] = this.nextTokenPrim(this.statblk, d1, d2);
		if (!!s) this.statblk = s;
    return t;
	}
 	
	nextTokenPrim(str, d1 = " ", d2 = "\n", all = false) {  // d2 must be equal or longer in length than d1  ")" and "):"
		if (!str) return;
	  let i = str.indexOf(d1);
    if (i > 0) {
			let j = (!!d2) ? str.indexOf(d2) : 0;
			if (j > 0 && j <= i) {
				d1 = d2;	// 
				i = j;	// Crappy hack to be able to search for 2 delims
			}
	    let t = str.substring(0, i);
			return [str.substr(i + d1.length), t];
		}
		if (all) return ["", str];
 	}


}


class Mook {
	constructor() {
		this.name = "";
		this.title = "bad guy";
		this.desc = "appearence";
		this.st = 10;
		this.dx = 10;
		this.iq = 10;
		this.ht = 10;
		this.dodge = 9;
		this.hp = 10;
		this.will = 10;
		this.per = 10;
		this.fp = 10;
		this.speed = 5;
		this.move = 5;
		this.sm = 0;
		this.dr = 1;
		this.notes = `Notes.   May include On-the-Fly formulas
[IQ to remember something] [Dodge] [+2 Blessed]`;
    this.traits = `Ugly [-4 from everyone]
High Pain Threshold; Annoying`;
    this.skills = `Barter-14
Search-13,Lockpicking-11`;
    this.melee = `Punch (12) 1d-2 cr
Kick (11) 1d cr`;
    this.ranged = `Slingshot (9) 1d-3 imp acc 2`;
	}
	
}