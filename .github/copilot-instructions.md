# GitHub Copilot Instructions for GURPS 4e Game Aid

This document provides comprehensive guidance for AI coding agents working on the GURPS 4e Game Aid for Foundry VTT.

## Project Overview

**GURPS 4e Game Aid** is an unofficial game system for Foundry VTT that provides digital tools for playing GURPS 4th edition. The system is built using TypeScript/JavaScript and follows Foundry VTT's document-based architecture.

### Key Information

- **System ID**: `gurps`
- **Version**: 0.18.6 (1.0.0-alpha in development)
- **Foundry Compatibility**: v13.x (minimum v13, verified v13.350)
- **Primary Languages**: TypeScript (modern modules), JavaScript (legacy)
- **License**: Steve Jackson Games Online Policy compliant
- **Main Authors**: Chris Normand (nose66), M. Jeff Wilson (nick.coffin.pi), Mikolaj Tomczynski (sasiedny)
- **Repository**: crnormand/gurps on GitHub

## Architecture Overview

### Document Structure

The system follows Foundry's dual-architecture pattern:

1. **Legacy V1 Documents** (`GurpsActor`, `GurpsItem`) - Original JavaScript implementation in `module/actor/_actor.js` and `module/_item.js`
2. **Modern V2 Documents** (`GurpsActorV2`, `GurpsItemV2`) - New TypeScript implementation in `module/actor/gurps-actor.ts` and `module/item/gurps-item.ts`

Key patterns:

- V2 documents extend Foundry base classes: `Actor<SubType>`, `foundry.documents.Item<SubType>`
- Data models use `TypeDataModel` and extend `BaseItemModel` for items
- Items implement `IContainable` interface for nested container support
- Both V1 and V2 coexist during migration period

### Module Organization

```
module/
├── actor/           # Actor documents, sheets, and components
├── item/            # Item documents, sheets, and data models
├── action/          # Attack and action system
├── data/            # Data models and schemas (TypeScript) not directly tied to Foundry documents
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

- **assets/**: Static assets (images, fonts)
- **dev-utilities/**: Development utilities
- **exportutils/**: Export utilities for external character sheet programs
- **lang/**: Internationalization files (en, de, fr, pt_br, ru)
- **lib/**: Third-party JavaScript libraries independent of Foundry
- **utils/**: Foundry-dependent utilities
- **scripts/**: Javascript libraries dependent on Foundry but not part of the module
- **test/**: Unit tests using Jest with TypeScript support

## Coding Standards and Patterns

### TypeScript/JavaScript Guidelines

#### Key Guidelines

1. Follow TypeScript best practices and idiomatic patterns
2. Maintain existing code structure and organization
3. Write unit tests for new functionality. Use table-driven unit tests (test.each) when possible.
4. Document public APIs and complex logic. Suggest changes to the `docs/` folder when appropriate
5. Use strict TypeScript settings - the project enforces noImplicitAny, strictNullChecks, and other strict flags

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

#### Commenting Standards

- Use JSDoc for public APIs and complex functions
- Inline comments for non-obvious logic
- Comments begin with a capital letter and end with a period or question mark.
- Maintain existing comment styles in legacy code

#### Foundry Document Patterns

##### Document Extensions

```typescript
// V2 Pattern (preferred for new code)
class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
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
// Use Foundry's TypeDataModel for structured data
class MyDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      name: new fields.StringField({ required: true }),
      value: new fields.NumberField({ initial: 0 }),
    }
  }
}

// Item data models extend BaseItemModel
class SkillModel extends BaseItemModel<SkillSchema> {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      difficulty: new fields.StringField(),
      points: new fields.NumberField({ min: 0 }),
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
// Modern items use typed data models extending BaseItemModel
class SkillModel extends BaseItemModel<SkillSchema> {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      difficulty: new fields.StringField(),
      points: new fields.NumberField({ min: 0 }),
    }
  }

  // Item models can have computed properties
  get effectiveLevel(): number {
    // Implementation
  }
}

// Items implement IContainable interface for nested item support
class GurpsItemV2<SubType extends Item.SubType = Item.SubType>
  extends foundry.documents.Item<SubType>
  implements IContainable<GurpsItemV2>
{
  get containedBy(): string | null {
    return this.modelV2.containedBy ?? null
  }

  get contents(): GurpsItemV2[] {
    return this.modelV2.contents
  }

  containsItem(item: GurpsItemV2): boolean {
    return this.modelV2.containsItem(item)
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

- Use Jest with TypeScript support via ts-jest and experimental VM modules
- Place tests in `test/` directory
- Mock Foundry globals in `test/jest.setup.js`
- Test files should end with `.test.ts` or `.test.js`
- Use table-driven tests (test.each) for multiple test cases

```typescript
// Example test structure
describe('Length', () => {
  it('parses inches correctly', () => {
    const length = Length.fromString('12 in', Length.Unit.Inch)
    expect(length?.value).toBe(12)
    expect(length?.unit).toBe(Length.Unit.Inch)
  })
})

// Table-driven test example
test.each([
  ['1d6+2 cr', { type: 'damage', formula: '1d6+2', damagetype: 'cr' }],
  ['2d-1 cut', { type: 'damage', formula: '2d-1', damagetype: 'cut' }],
])('parses damage: %s', (input, expected) => {
  const result = parseForRollOrDamage(input)
  expect(result).toMatchObject(expected)
})
```

#### Mocking Patterns

```typescript
// Mock Foundry TypeDataModel with getter-only property support
global.foundry = {
  abstract: {
    TypeDataModel: class {
      constructor(data, options) {
        if (data) {
          for (const [key, value] of Object.entries(data)) {
            // Check if it's a getter in this class or any parent class
            let obj = this
            let isGetter = false
            while (obj) {
              const descriptor = Object.getOwnPropertyDescriptor(obj, key)
              if (descriptor && descriptor.get && !descriptor.set) {
                isGetter = true
                break
              }
              obj = Object.getPrototypeOf(obj)
            }
            if (isGetter) continue
            this[key] = value
          }
        }
      }
    },
  },
}

// Mock embedded document operations
actor.updateEmbeddedDocuments = jest.fn().mockResolvedValue([])
actor.createEmbeddedDocuments = jest.fn().mockResolvedValue([])
actor.deleteEmbeddedDocuments = jest.fn().mockResolvedValue([])

// Mock game.settings for tests
// @ts-expect-error
if (!global.game.settings) {
  // @ts-expect-error
  global.game.settings = {
    get: jest.fn().mockReturnValue(false),
  }
}
```

#### Test Commands

```bash
npm run test      # Run tests once
npm run tdd       # Run tests with coverage and watch mode
```

#### Jest Configuration

The project uses Jest with experimental VM modules:

- **Preset**: ts-jest/presets/default-esm
- **Environment**: node
- **Extensions as ESM**: .ts, .tsx
- **Module name mapper**: Maps .js imports to TypeScript files, stubs miscellaneous-settings
- **Transform**: ts-jest with useESM enabled
- **Setup files**: test/jest.setup.js (excluded from TypeScript compilation)

Key configuration:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(.*)\\.js$': '$1',
    '^module/(.*)$': '<rootDir>/module/$1',
    '^../../lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',
  },
  setupFiles: ['./test/jest.setup.js'],
}
```

#### Current Test Coverage

The project includes tests organized to mirror the module structure:

**Actor Tests:**

- `test/module/actor/gurps-actor.test.ts` - GurpsActorV2 methods (moveItem, \_preUpdate, etc.)

**Chat Tests:**

- `test/module/chat/slam-calculator.test.ts` - GURPS slam damage calculations

**Data Model Tests:**

- `test/module/data/common/length.test.ts` - Length measurement conversions
- `test/module/data/mixins/container-utils.test.ts` - Container utility functions

**Utility Tests:**

- `test/module/utilities/text-utilties.test.ts` - Text utility functions

**Library Tests:**

- `test/lib/utilities.test.ts` - Utility functions (displayMod, makeSelect, splitArgs, etc.)
- `test/lib/parselink.test.ts` - Link parsing and damage formula parsing

Test infrastructure:

- `test/jest.setup.js` - Foundry VTT API mocking (TypeDataModel, Actor, Item, etc.)
- `test/foundry-utils/` - Foundry collection mocks
- `test/stubs/` - Stub implementations for dependencies

**Test Organization:**
Tests are organized in a directory structure that mirrors the module source files being tested. When adding new tests, place them in the corresponding location under `test/` that matches the `module/` or `lib/` directory structure.

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

### TypeScript Configuration

The project uses strict TypeScript settings:

- **Target**: ESNext
- **Module**: NodeNext with NodeNext resolution
- **Strict mode**: Enabled with noImplicitAny, strictNullChecks, strictFunctionTypes
- **Output**: dist/ directory with source maps
- **Types**: Includes jquery, jest, and fvtt-types
- **Exclusions**: build/, node_modules/, dist/, dev-utilities/, scripts/, test/jest.setup.js

Key TypeScript patterns:

- Use `@ts-expect-error` for intentional type violations (e.g., accessing global.game in tests)
- Exclude Jest setup files from compilation to avoid namespace conflicts
- Global type definitions in `global.d.ts` extend Foundry types

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
// Use Foundry TypeDataModel for structured data
class MyDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      name: new fields.StringField({ required: true }),
      value: new fields.NumberField({ initial: 0 }),
    }
  }
}

// Item data models extend BaseItemModel with typed schemas
class EquipmentModel extends BaseItemModel<EquipmentSchema> {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      eqt: new fields.SchemaField({
        count: new fields.NumberField({ initial: 1, min: 0 }),
        carried: new fields.BooleanField({ initial: false }),
        equipped: new fields.BooleanField({ initial: false }),
      }),
    }
  }

  // Computed properties
  get isCarried(): boolean {
    return this.eqt.carried
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

- Use JSDoc for public APIs
- Document complex logic with inline comments
- Comments should begin with a capital letter and end with a period or question mark.

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
- `CONFIG.Actor.documentClass` - Actor document class
- `CONFIG.Item.documentClass` - Item document class

This document should be updated as the codebase evolves and new patterns emerge.
