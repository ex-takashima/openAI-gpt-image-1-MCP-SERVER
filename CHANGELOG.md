# Changelog

All notable changes to the OpenAI GPT-Image-1 MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-04-22

### Added
- **`edit` and `transform` operations in the batch CLI** (`openai-gpt-image-batch`)
  - New `operation` field on each batch job: `"generate"` (default), `"edit"`, or `"transform"`
  - New job fields `reference_image_path` (required for `edit`/`transform`) and `mask_image_path` (optional, `edit` only)
  - New job fields `model` and `input_fidelity` routed through to the underlying tool
  - `src/utils/batch-manager.ts` — dispatches to `generate_image` / `edit_image` / `transform_image` via `JobManager` based on `operation`, and resolves `reference_image_path` / `mask_image_path` against the process working directory (matching existing `output_dir` semantics)
  - `src/utils/batch-config.ts` — validator enforces: `reference_image_path` required for `edit`/`transform`, `mask_image_path` only valid for `edit`, and enum checks for `operation` / `model` / `input_fidelity`
  - Example configs: `examples/batch-edit.json`, `examples/batch-transform.json`
- Documentation updates in `docs/BATCH_PROCESSING.md` / `.ja.md` and `docs/CLI_REFERENCE.md` / `.ja.md` covering the new fields, JSON schema, CLI usage examples, and relative-path resolution rules

### Changed
- CLI `--help` header reworded from "Batch Generation Tool" to "Batch Tool (generate / edit / transform)" with a short description of the new fields
- CLI `--version` output (`openai-gpt-image-batch`) now reports the package version (previously hard-coded to `1.1.0` and out of sync)

### Notes
- No breaking changes. Existing generate-only configs continue to work without modification (the `operation` field defaults to `"generate"`).
- `--estimate-only` does **not** yet account for the additional input tokens consumed by reference images in `edit`/`transform`. Treat those estimates as a lower bound.
- Base64 image inputs are intentionally not supported in the CLI (use the MCP server for that workflow).

## [1.3.0] - 2026-04-22

### Added
- **gpt-image-2 support** across `generate_image`, `edit_image`, `transform_image`, and batch CLI
  - New model identifier `gpt-image-2` in all tool `model` enums
  - New size presets: `2048x2048`, `2048x1152`, `1152x2048`, `3840x2160`, `2160x3840`
  - Custom `WxH` sizes for gpt-image-2 (16px multiples, each edge ≤3840, ratio ≤3:1, 0.65–8.3 megapixels)
  - `gpt-image-2` pricing table in `calculateCost()` (low: $0.006, medium: $0.053, high: $0.211 @ 1024x1024; 4K sizes are experimental pricing)
  - Pixel-scaled cost estimation fallback for custom sizes not in the table
  - `MODEL_CAPABILITIES` declarative table in `src/types/models.ts` centralizing per-model feature flags and size constraints
  - `isExperimentalSize()` helper with warning logs for `3840x2160` / `2160x3840`
  - `examples/batch-gpt-image-2.json` sample batch configuration covering 1K / 2K / 4K

### Changed
- `validateImageSize(size, model)` — signature extended with model context; each model now validates against its own capability set
- `transparent_background` — now rejected with `InvalidParams` when combined with `gpt-image-2` (OpenAI API does not support it)
- `input_fidelity` — now capability-driven: forwarded for gpt-image-1.5, silently ignored with a debug warning for gpt-image-2 (OpenAI API returns 400 if sent) and gpt-image-1
- Tool schema `description` fields updated to document gpt-image-2 constraints and custom-size rules

### Migration notes
- **No breaking changes** for gpt-image-1 / gpt-image-1.5 users — existing configs continue to work.
- To use gpt-image-2: set `model: "gpt-image-2"` and optionally pick one of the new size presets or a custom `WxH`.
- If you programmatically pass `transparent_background: true` or `input_fidelity` with gpt-image-2, the former now errors out immediately; the latter is dropped with a warning in DEBUG logs.

## [1.0.4] - 2025-10-17

### Added
- Tilde (~) expansion support for environment variable paths
  - `OPENAI_IMAGE_OUTPUT_DIR` now supports `~/Pictures/ai-images` format
  - `OPENAI_IMAGE_INPUT_DIR` now supports tilde expansion
  - `HISTORY_DB_PATH` now supports tilde expansion
- Comprehensive `.env.example` with all documented environment variables
  - Added metadata embedding controls
  - Added thumbnail configuration
  - Added path configuration with examples
  - Clear descriptions for all options

### Changed
- Updated README.md with complete metadata embedding documentation
  - Added `OPENAI_IMAGE_EMBED_METADATA` environment variable documentation
  - Added `OPENAI_IMAGE_METADATA_LEVEL` environment variable documentation
  - Expanded metadata field descriptions with proper naming
  - Added size impact information for each metadata level
- Updated README.ja.md (Japanese) with same metadata documentation
- Enhanced CODING_CONVENTIONS.md
  - Added comprehensive Test conventions section
  - Added Security best practices section
  - Added Git/Version control guidelines
  - Updated checklist with security and testing items
- Fixed version consistency in `src/index.ts` (now matches package.json)

### Fixed
- Path resolution issues when using tilde (~) in environment variables
- Windows path resolution errors with home directory expansion
- "Security error: Access denied" when using `~` in configuration

### Documentation
- Updated both English and Japanese READMEs with:
  - Complete environment variable documentation
  - Metadata embedding control instructions
  - Three metadata levels (minimal/standard/full) explained
  - Tilde expansion usage examples
- Removed duplicate `README_ja.md` file (kept standard `README.ja.md`)
- Corrected project name in CODING_CONVENTIONS.md

### Technical
- Added `expandTilde()` helper function in `src/utils/path.ts`
- Improved path resolution in `getDefaultOutputDirectory()` and `getDefaultInputDirectory()`
- Zero breaking changes - fully backward compatible

## [1.0.3] - 2025-10-16

### Added

#### Multi-Image Generation
- `sample_count` parameter (1-10) for all generation tools
- Automatic sequential file numbering for batch outputs
- Multi-image cost calculation and reporting

#### History Management System
- SQLite database for persistent history (`~/.openai-gpt-image/history.db`)
- `list_history` tool for browsing generation history
  - Filter by tool name
  - Full-text search in prompts
  - Pagination support (limit/offset)
- `get_history_by_uuid` tool for detailed record retrieval
- Automatic history recording for all generations
- UUID tracking for each generation
- Database indexing for optimized queries

#### Async Job System
- `start_generation_job` tool for background processing
- `check_job_status` tool for progress monitoring
- `get_job_result` tool for retrieving completed results
- `cancel_job` tool for cancelling pending/running jobs
- `list_jobs` tool for browsing all jobs
- Job status tracking (pending/running/completed/failed/cancelled)
- Progress percentage tracking (0-100%)
- Background execution without blocking

#### Metadata Embedding
- Automatic metadata injection in PNG files (tEXt chunks)
  - MCP-Tool, MCP-Prompt, MCP-Model
  - MCP-Created, MCP-Size, MCP-Quality, MCP-Format
  - MCP-History-UUID
- Automatic metadata injection in JPEG files (EXIF UserComment)
- Self-documenting images with generation parameters

#### Database
- History table with indexed columns
- Jobs table for async processing
- WAL mode for better performance
- Automatic schema creation

#### Documentation
- NEW_TOOLS_GUIDE.md with comprehensive feature documentation
- Updated CLAUDE.md with new tool definitions
- Updated README.md with advanced features section
- RELEASE_NOTES.md with detailed changelog
- TEST_REPORT.md with complete test results

### Changed
- Updated all generation tools to support `sample_count`
- Enhanced error messages for better debugging
- Improved type definitions for better type safety
- Database module made more accessible for job manager

### Fixed
- Variable declaration order in metadata embedding
- Cost calculation property access in test scripts

### Technical
- 7 new MCP tools (total: 11)
- 6 new TypeScript modules
- 2 database tables with 7 indexes
- 77 test cases with 100% pass rate
- Zero breaking changes - fully backward compatible

## [1.0.2] - 2025-10-15

### Changed
- Improved error handling across all tools
- Enhanced cross-platform path handling
- Better debug logging

### Fixed
- Path resolution issues on Windows
- Error message clarity improvements

## [1.0.1] - 2025-10-14

### Fixed
- Removed unsupported `response_format` parameter from API requests
- Added support for both URL and b64_json responses
- Download and convert images from URLs when needed
- Updated all image tools (generate, edit, transform)
- Added debug logging for request parameters

### Changed
- Bumped version to 1.0.1

## [1.0.0] - 2025-10-13

### Added
- Initial release of OpenAI GPT-Image-1 MCP Server
- `generate_image` tool for text-to-image generation
- `edit_image` tool for image inpainting
- `transform_image` tool for style transfer
- `list_generated_images` tool for file management
- Support for multiple image sizes (1024x1024, 1024x1536, 1536x1024)
- Quality levels (low, medium, high, auto)
- Multiple output formats (PNG, JPEG, WebP)
- Transparent background support (PNG)
- Cost calculation and usage tracking
- Content moderation support
- Base64 image encoding support
- Cross-platform compatibility (macOS, Windows, Linux)
- Smart path handling with customizable output directory
- Debug mode for troubleshooting
- Comprehensive documentation
- MIT License

---

## Release Links

- [1.0.3] - Major feature update with history, async jobs, and metadata
- [1.0.2] - Error handling improvements
- [1.0.1] - API parameter fixes
- [1.0.0] - Initial release

## Versioning Policy

- **Major version** (x.0.0): Breaking changes
- **Minor version** (0.x.0): New features, backward compatible
- **Patch version** (0.0.x): Bug fixes, backward compatible

---

**Note**: For detailed migration guides and feature documentation, see RELEASE_NOTES.md and NEW_TOOLS_GUIDE.md.
