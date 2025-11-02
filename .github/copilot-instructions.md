# GitHub Copilot Instructions for GURPS 4e Game Aid

This document provides comprehensive guidance for AI coding agents working on the GURPS 4e Game Aid for Foundry VTT.

## Project Overview

**GURPS 4e Game Aid** is an unofficial game system for Foundry VTT that provides digital tools for playing GURPS 4th edition. The system is built using TypeScript/JavaScript and follows Foundry VTT's document-based architecture.

### Key Information

- **System ID**: `gurps`
- **Foundry Compatibility**: v13.x (minimum v13, verified v13.346)
- **Primary Languages**: TypeScript (modern modules), JavaScript (legacy)
- **License**: Steve Jackson Games Online Policy compliant
- **Main Authors**: Chris Normand (nose66), M. Jeff Wilson (nick.coffin.pi), Mikolaj Tomczynski (sasiedny)

## Architecture Overview

### Document Structure

The system follows Foundry's dual-architecture pattern:

1. **Legacy V1 Documents** (`GurpsActor`, `GurpsItem`) - Original JavaScript implementation
2. **Modern V2 Documents** (`GurpsActorV2`, `GurpsItemV2`) - New TypeScript implementation

### Module Organization

```
module/
├── actor/           # Actor documents, sheets, and components
├── item/            # Item documents, sheets, and data models
├── action/          # Attack and action system
├── data/            # Data models and schemas (TypeScript)
├── combat/          # Combat and initiative system
├── damage/          # Damage calculation and application
├── effects/         # Active effects and status management
├── gcs-importer/    # GCS (GURPS Character Sheet) import system
├── pdf/             # PDF reference integration
├── token/           # Token enhancements and HUD
├── ui/              # User interface components
└── utilities/       # Shared utility functions
```

### Key Libraries and Dependencies

- **lib/**: Core utilities without Foundry dependencies
- **utils/**: Foundry-dependent utilities
- **scripts/**: Third-party JavaScript libraries
- **lang/**: Internationalization files (en, de, fr, pt_br, ru)

## Coding Standards and Patterns

### TypeScript/JavaScript Guidelines

#### Key Guidelines

1. Follow TypeScript best practices and idiomatic patterns
2. Maintain existing code structure and organization
3. Write unit tests for new functionality. Use table-driven unit tests when possible.
4. Document public APIs and complex logic. Suggest changes to the `docs/` folder when appropriate

#### File Extensions and Types

- `.ts` for new TypeScript files (preferred)
- `.js` for legacy JavaScript files
- Use ES modules (`import`/`export`) throughout
- Maintain backward compatibility when updating legacy code

#### Naming Conventions

- **Classes**: PascalCase (`GurpsActor`, `MeleeAttackModel`)
- **Files**: kebab-case for TypeScript and JavaScript (`gurps-actor.ts`, `actor-importer.js`)
- **Variables/Functions**: camelCase (`calculateDamage`, `isEnabled`)
- **Constants**: SCREAMING_SNAKE_CASE (`SETTING_USE_FOUNDRY_ITEMS`)
- **Foundry Extensions**: Prefix with `Gurps` (`GurpsToken`, `GurpsTokenHUD`)

#### Foundry Document Patterns

##### Document Extensions

```typescript
// V2 Pattern (preferred for new code)
class GurpsActorV2<SubType extends Actor.SubType = Actor.SubType> extends foundry.documents.Actor<SubType> {
  override prepareBaseData(): void {
    super.prepareBaseData()
    // Custom preparation
  }
}

// Legacy Pattern (maintain for compatibility)
export class GurpsActor extends Actor {
  prepareData() {
    super.prepareData()
    // Legacy preparation
  }
}
```

##### Data Models

```typescript
// Use Foundry's DataModel for structured data
class LengthSchema {
  static defineSchema() {
    return {
      value: new fields.NumberField({ required: true, min: 0 }),
      unit: new fields.StringField({
        choices: Object.values(LengthUnit),
        initial: LengthUnit.Inch,
      }),
    }
  }
}
```

##### Application Classes

```typescript
// V2 Applications (preferred)
class ModernApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'app-id',
    window: { title: 'App Title' },
  }
}

// Legacy Applications (maintain for compatibility)
export class LegacyApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'legacy-app',
      title: 'Legacy App',
    })
  }
}
```

### Component Architecture

#### Actor Components (Legacy System)

The legacy system uses component-based architecture:

```javascript
// Actor components are plain objects with methods
export class Skill extends Leveled {
  static fromObject(data, actor) {
    // Factory pattern for creating components
  }
}
```

#### Item System V2 (Modern)

```typescript
// Modern items use typed data models
class SkillModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      difficulty: new fields.StringField(),
      points: new fields.NumberField({ min: 0 }),
    }
  }
}
```

### Import/Export Patterns

#### ES Module Imports

```typescript
// Relative imports with extensions
import { GurpsActor } from './actor/gurps-actor.js'
import { Length } from '../data/common/length.js'

// Re-exports in index files
export * from './combat.js'
export * from './combatant.js'
```

#### Module Registration

```typescript
// Module pattern for feature organization
export const Combat: GurpsModule = {
  init() {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
  },
}
```

### Error Handling and Validation

#### Type Guards

```typescript
// Use type guards for runtime type checking
function isGurpsActor(actor: Actor): actor is GurpsActor {
  return actor.type === 'character' || actor.type === 'enemy'
}
```

#### Null Safety

```typescript
// Use optional chaining and nullish coalescing
const level = item.system?.ski?.level ?? 0
const name = actor.name || 'Unknown Actor'
```

### Testing Standards

#### Unit Tests

- Use Jest with TypeScript support
- Place tests in `test/` directory
- Mock Foundry globals in `test/jest.setup.js`
- Test files should end with `.test.ts` or `.test.js`

```typescript
// Example test structure
describe('Length', () => {
  it('parses inches correctly', () => {
    const length = Length.fromString('12 in', Length.Unit.Inch)
    expect(length?.value).toBe(12)
    expect(length?.unit).toBe(Length.Unit.Inch)
  })
})
```

#### Test Commands

```bash
npm run test      # Run tests once
npm run tdd       # Run tests with coverage and watch mode
```

## Development Workflow

### Rules of Engagement (from develop.md)

1. **Bug First Policy**: Pick up bug issues before adding new features
2. **Daily Integration**: No branch should go unmerged for more than a day
3. **Small, Logical Commits**: Each commit should maintain a working state
4. **Test-Driven Development**: Run `npm run tdd` and ensure all tests pass
5. **Pull Request Review**: All changes require review by Chris (Nose) or Jeff
6. **Documentation**: Use the wiki for development discussions

### Build System

```bash
npm run build         # Full build (TypeScript + styles + static files)
npm run build:code    # TypeScript compilation only
npm run build:styles  # SCSS compilation
npm run dev           # Development mode with watchers
npm run watch         # Watch all file types
```

### File Organization

#### Module Boundaries

- Keep Foundry-independent code in `lib/`
- Place Foundry-dependent utilities in `utils/`
- Organize features by domain in `module/`

#### Legacy vs Modern Code

- **V1 (Legacy)**: Maintain but don't extend
- **V2 (Modern)**: Preferred for new features
- **Migration**: Gradual transition from V1 to V2

## Common Patterns and Anti-Patterns

### ✅ Preferred Patterns

#### Data Model Usage

```typescript
// Use Foundry DataModel for structured data
class MyDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      name: new fields.StringField({ required: true }),
      value: new fields.NumberField({ initial: 0 }),
    }
  }
}
```

#### Async/Await

```typescript
// Use async/await instead of Promises
async function updateActor(actor: GurpsActor, data: object) {
  await actor.update(data)
  return actor
}
```

#### Type Safety

```typescript
// Use TypeScript overloads for better type safety
function getItemAttacks(options: { attackType: 'melee' }): MeleeAttackModel[]
function getItemAttacks(options: { attackType: 'ranged' }): RangedAttackModel[]
function getItemAttacks(options = { attackType: 'both' }) {
  // Implementation
}
```

### ❌ Anti-Patterns

#### Direct DOM Manipulation

```typescript
// Avoid - use Foundry's application system instead
document.getElementById('my-element').innerHTML = 'content'

// Prefer - use Handlebars templates and Application classes
```

#### Synchronous File Operations

```typescript
// Avoid - use Foundry's async file handling
fs.readFileSync('file.json')

// Prefer - use Foundry's file utilities
await foundry.utils.fetchJsonWithTimeout('file.json')
```

## GURPS-Specific Guidelines

### Game Mechanics

#### Dice Rolling

- Use GURPS 3d6 system (`3d6 <= skill`)
- Support dice modifiers and margin calculations
- Integrate with Foundry's dice system

#### Damage System

```typescript
// Damage follows GURPS patterns: formula + type + location
interface DamageData {
  formula: string // "2d+1", "sw+2"
  damagetype: string // "cut", "imp", "burn"
  hitlocation?: string // "torso", "head"
}
```

#### Attributes and Characteristics

- Follow GURPS attribute system (ST, DX, IQ, HT)
- Support secondary characteristics (HP, FP, Speed, etc.)
- Handle derived values and point costs

### Import Systems

#### GCS Integration

- Support GCS (GURPS Character Sheet) file import
- Maintain schema compatibility with GCS formats
- Handle GCS-specific data structures

#### PDF References

- Integrate with GURPS PDF page references
- Support SJG product mappings
- Handle PDF link generation

### Measurement Systems

- Support both Imperial and Metric units
- Use the `Length` class for distance calculations
- Follow GURPS conversion rules (not real-world)

## Localization

### i18n Patterns

```typescript
// Use Foundry's localization system
const label = game.i18n.localize('GURPS.SkillLevel')
const formatted = game.i18n.format('GURPS.DamageFormula', { damage: '2d+1' })
```

### Supported Languages

- English (en) - Primary
- German (de)
- French (fr)
- Portuguese/Brazil (pt_br)
- Russian (ru)

## Performance Considerations

### Memory Management

- Avoid circular references in actor/item relationships
- Use weak references where appropriate
- Clean up event listeners in application close handlers

### Rendering Optimization

- Use Foundry's render caching
- Minimize DOM manipulations
- Batch updates when possible

## Integration Guidelines

### External Modules

- Support DAE (Dynamic Active Effects)
- Integrate with Foundry module ecosystem
- Maintain compatibility with common modules

### Foundry Version Compatibility

- Target Foundry v13.x
- Use compatibility layers for version differences
- Mark compatibility-specific code with comments

## Security and Best Practices

### Content Security

- Validate user input in parsers (`parselink.js`)
- Sanitize HTML content in templates
- Use Foundry's permission system

### Data Integrity

- Validate imported data structures
- Handle migration between data versions
- Maintain backward compatibility

## Documentation Standards

### Code Comments

```typescript
/**
 * Calculate effective skill level including modifiers
 * @param baseLevel The base skill level
 * @param modifiers Array of modifier objects
 * @returns Effective skill level
 */
function calculateEffectiveLevel(baseLevel: number, modifiers: Modifier[]): number {
  // Implementation
}
```

### JSDoc for JavaScript

```javascript
/**
 * @param {GurpsActor} actor
 * @param {string} skillName
 * @returns {number|undefined}
 */
function getSkillLevel(actor, skillName) {
  // Implementation
}
```

## Debugging and Development Tools

### Console Utilities

- Use `GURPS` global object for debugging
- Implement development-only debug functions
- Support verbose logging modes

### Coverage and Testing

- Run coverage with `npm run tdd`
- Use Chrome DevTools coverage for manual testing
- Maintain high test coverage for critical paths

---

## Quick Reference

### Common File Locations

- **Main System**: `module/gurps.js`
- **Actor Classes**: `module/actor/gurps-actor.ts` (V2), `module/actor/actor.js` (V1)
- **Item Classes**: `module/item/gurps-item.ts` (V2), `module/item.js` (V1)
- **Data Models**: `module/*/data/*.ts`
- **Tests**: `test/*.test.ts`
- **Utilities**: `lib/` (Foundry-independent), `utils/` (Foundry-dependent)

### Build Commands

```bash
npm run build        # Full production build
npm run dev          # Development mode with watchers
npm run test         # Run unit tests
npm run tdd          # Test-driven development mode
npm run prettier     # Format code
```

### Key Globals

- `GURPS` - System global object
- `game.gurps` - System runtime instance
- `CONFIG.Actor.documentClass` - Actor document class
- `CONFIG.Item.documentClass` - Item document class

This document should be updated as the codebase evolves and new patterns emerge.
