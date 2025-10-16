# Changelog

All notable changes to the OpenAI GPT-Image-1 MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
