/**
 * Custom type declarations for Foundry VTT data fields.
 *
 * These re-export types from fvtt-types as a proper namespace to support
 * generic constraints like `Schema extends fields.DataSchema`.
 *
 * Pattern: Use these types for type annotations, use `foundry.data.fields`
 * at runtime for actual field instantiation.
 */

export import fields = foundry.data.fields
