# GCS DataModel Plans and Notes

The GCS data models for Characters and associated Items (Traits, Skills, Spells, Equipment, Notes, Weapons, Trait
Modifiers, Equipment Modifiers, and associated containers) and associated code has a few parts which may not
translate directly to a model fit for use in FoundryVTT.

Note that GCS follows a pattern of having a "Data" struct which contains all the persistent data for an object.
The entire object is not persisted in the JSON file, only the Data struct. In most cases, this makes sense and should be
directly replicated in FoundryVTT. The non-persistent data represents derived values, cached values, or runtime-only
objects.

The core data models follow below. Data types such as PointsRecord and Profile which contain only primitive fields have
been omitted for brevity.

<details>
  <summary>EntityData struct</summary>

```go
type EntityData struct {
Version          int             `json:"version"`
ID               tid.TID         `json:"id"`
TotalPoints      fxp.Int         `json:"total_points"`
PointsRecord     []*PointsRecord `json:"points_record,omitzero"`
Profile          Profile         `json:"profile"`
SheetSettings    *SheetSettings  `json:"settings,omitzero"`
Attributes       *Attributes     `json:"attributes,omitzero"`
Traits           []*Trait        `json:"traits,omitzero"`
Skills           []*Skill        `json:"skills,omitzero"`
Spells           []*Spell        `json:"spells,omitzero"`
CarriedEquipment []*Equipment    `json:"equipment,omitzero"`
OtherEquipment   []*Equipment    `json:"other_equipment,omitzero"`
Notes            []*Note         `json:"notes,omitzero"`
CreatedOn        jio.Time        `json:"created_date"`
ModifiedOn       jio.Time        `json:"modified_date"`
ThirdParty       map[string]any  `json:"third_party,omitzero"`
}
```

"Entity" refers to Characters and NPCs.

</details>

<details>
  <summary>TraitData struct</summary>

```go
type TraitData struct {
SourcedID
TraitEditData
ThirdParty map[string]any `json:"third_party,omitzero"`
Children   []*Trait       `json:"children,omitzero"` // Only for containers
parent     *Trait
}

type TraitEditData struct {
TraitSyncData
VTTNotes     string            `json:"vtt_notes,omitzero"`
UserDesc     string            `json:"userdesc,omitzero"`
Replacements map[string]string `json:"replacements,omitzero"`
Modifiers    []*TraitModifier  `json:"modifiers,omitzero"`
SelfControl  selfctrl.Roll     `json:"cr,omitzero"`
Frequency    frequency.Roll    `json:"frequency,omitzero"`
Disabled     bool              `json:"disabled,omitzero"`
TraitNonContainerOnlyEditData
TraitContainerSyncData
}

type TraitNonContainerOnlyEditData struct {
TraitNonContainerSyncData
Levels           fxp.Int     `json:"levels,omitzero"`
Study            []*Study    `json:"study,omitzero"`
StudyHoursNeeded study.Level `json:"study_hours_needed,omitzero"`
}

type TraitSyncData struct {
Name             string              `json:"name,omitzero"`
PageRef          string              `json:"reference,omitzero"`
PageRefHighlight string              `json:"reference_highlight,omitzero"`
LocalNotes       string              `json:"local_notes,omitzero"`
Tags             []string            `json:"tags,omitzero"`
Prereq           *PrereqList         `json:"prereqs,omitzero"`
SelfControlAdj   selfctrl.Adjustment `json:"cr_adj,omitzero"`
}

type TraitNonContainerSyncData struct {
BasePoints     fxp.Int   `json:"base_points,omitzero"`
PointsPerLevel fxp.Int   `json:"points_per_level,omitzero"`
Weapons        []*Weapon `json:"weapons,omitzero"`
Features       Features  `json:"features,omitzero"`
RoundCostDown  bool      `json:"round_down,omitzero"`
CanLevel       bool      `json:"can_level,omitzero"`
}

type TraitContainerSyncData struct {
Ancestry       string          `json:"ancestry,omitzero"`
TemplatePicker *TemplatePicker `json:"template_picker,omitzero"`
ContainerType  container.Type  `json:"container_type,omitzero"`
}
```

Note that all items which can be containers (Traits, Equipment, Skills, Spells, Notes) will have separate Container and
NonContaienr structs to separate out the data fields which only apply to containers. I think this should be replicated
in FoundryVTT as it saves us from maintaining essentially twio separate data models for each item type.

Items also have Sync data and non-Sync data. Sync data is data which can be synchronised from a reference library item,
whereas non-Sync data (things like Trait levels, Skill points spent, Study entries) are not synchronised because they
will almost certainly be different for each character.

There is reasonable justification for replicating the synchronization functionality in FoundryVTT, as it would amount to
a step further towards users being able to create and maintain characters without the need for external tools. However,
this is not an immediate requirement so can be deferred to a later date.

</details>

<details>
  <summary>PrereqList</summary>

This is the first real complication when it comes to importing this model into FoundryVTT. GCS has several structs which
can contain structs of the same type, forming a potentially indefinite tree structure. The PrereqList is one such
struct.

I propose that we flatten this structure when importing into FoundryVTT, maintaining a flat list of prerequisites
stored on the Item, with relationships between prerequisites represented via parent IDs.

```go
type PrereqList struct {
Parent  *PrereqList     `json:"-"`
Type    prereq.Type     `json:"type"`
All     bool            `json:"all"`
WhenTL  criteria.Number `json:"when_tl,omitzero"`
Prereqs Prereqs         `json:"prereqs,omitzero"`
}
```

</details>

## Attribute Definitions and Inline Scripting

In a somewhat recent version of GCS, the previous custom script parser and interpreter was replaced with a new system
based on JavaScript. Further, the scripts which were previously used only in Attribute Definitions were expanded
to be able to output values for any rich text field in GCS, such as notes for any Item, and even previously primitive
fields like Weight and Cost.

I have already started work on implementing a limited script interpreter in FoundryVTT which aims to handle the same
subset of the JavaScript language as GCS, while exposing only the necessary APIs to access character data. The aim of
this is as close as we can get to exact feature parity with GCS' scripting system.
