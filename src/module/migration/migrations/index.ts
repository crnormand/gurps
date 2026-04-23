import { MigrationEntry } from '../types.js'

import { v0_18_1 } from './v0_18_1.js'
import { v1_0_0 } from './v1_0_0.js'

/* ---------------------------------------- */

export const migrations: MigrationEntry[] = [v0_18_1, v1_0_0]
