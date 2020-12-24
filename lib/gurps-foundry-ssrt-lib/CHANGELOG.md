# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- nothing to reveal at the moment

## [1.1.0] - 2020-12-24

### Added
- A new `speedRangeTable` on the SSRT class which returns a speed/range table as structured data
- The `parseExpression` function in Parsing.js which parses a size/speed/range expression and returns the linear dimension and unit of measure (according to the constants in Units.js) is now documented for public use.

## [1.0.0] - 2020-08-21

### Added
- The SSRT class which can be used to calculate size modifiers and speed/range penalties based on either structured data or natural language expressions (such as `5 yards`).
- Support for US customary as well as metric units. While internal logic uses US customary, two methods of conversion from metric are supported: the "real" one, and one which equates 1 meter with 1 yard.  