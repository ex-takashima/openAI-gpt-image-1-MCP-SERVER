# Release Notes

## Version 1.0.3 - Major Feature Update (2025-10-16)

This is a major feature release that significantly expands the capabilities of the OpenAI GPT-Image-1 MCP Server with history management, async job processing, and metadata embedding.

---

## 🎉 What's New

### Multi-Image Generation
- **Batch Processing**: Generate 1-10 images in a single request using the `sample_count` parameter
- **Automatic Numbering**: Files are automatically saved with sequential numbering (`output_1.png`, `output_2.png`, etc.)
- **Cost Transparency**: Total cost is clearly displayed, multiplied by the number of images
- **Universal Support**: Available across all tools: `generate_image`, `edit_image`, `transform_image`

### History Management System
- **SQLite Database**: All generations automatically saved to `~/.openai-gpt-image/history.db`
- **Searchable History**: Full-text search across prompts and parameters
- **UUID Tracking**: Each generation receives a unique identifier for easy reference
- **Detailed Records**: Complete information including:
  - Timestamp
  - Tool used
  - Full prompt and parameters
  - Output file paths
  - Image settings (size, quality, format)
  - Sample count

### New History Tools
- **`list_history`**: Browse generation history with filters and pagination
  - Filter by tool name
  - Search by prompt text
  - Configurable limit and offset
- **`get_history_by_uuid`**: Retrieve detailed information about specific generations
  - Complete parameter display
  - All output file paths
  - Generation metadata

### Async Job System
Complete background processing system for long-running operations:

- **`start_generation_job`**: Start background image generation
  - Queue multiple jobs
  - Continue working while processing
  - Supports all generation tools

- **`check_job_status`**: Monitor job progress
  - Real-time status updates
  - Progress percentage (0-100%)
  - Status indicators: pending, running, completed, failed, cancelled

- **`get_job_result`**: Retrieve completed job results
  - Output file paths
  - History UUID for detailed info
  - Error messages if failed

- **`cancel_job`**: Cancel pending or running jobs
  - Immediate cancellation
  - Frees up system resources

- **`list_jobs`**: Browse all async jobs
  - Filter by status or tool
  - Pagination support
  - Progress tracking

### Metadata Embedding
Automatic metadata injection into all generated images:

**PNG Files** - tEXt chunks:
- `MCP-Tool`: Tool name used
- `MCP-Prompt`: Generation prompt
- `MCP-Model`: Model name (gpt-image-1)
- `MCP-Created`: ISO timestamp
- `MCP-Size`: Image dimensions
- `MCP-Quality`: Quality level
- `MCP-Format`: Output format
- `MCP-History-UUID`: Link to database record

**JPEG Files** - EXIF UserComment:
- JSON-encoded metadata with same fields

**Benefits**:
- Images are self-documenting
- Metadata survives file moves
- Easy to recreate with same parameters
- Extractable with `exiftool`

---

## 🔧 Technical Improvements

### Database Architecture
- **SQLite with WAL Mode**: High-performance Write-Ahead Logging
- **Optimized Indexing**: Fast queries on timestamp, tool name, UUID
- **Two-Table Design**:
  - `history`: Generation records
  - `jobs`: Async job tracking
- **Automatic Schema Migration**: Tables created on first run

### Type Safety
- Comprehensive TypeScript types for:
  - History records (`HistoryRecord`, `CreateHistoryParams`, `SearchHistoryParams`)
  - Async jobs (`JobRecord`, `JobStatus`, `CreateJobParams`)
  - Tool parameters (all tools)
- Strict error handling with `McpError`

### Code Organization
- Modular tool structure
- Centralized database management
- Singleton pattern for managers
- Clear separation of concerns

---

## 📊 Statistics

- **New Tools**: 7 (list_history, get_history_by_uuid, 5 async job tools)
- **Total Tools**: 11 (from 4 in v1.0.2)
- **New Files**: 6 TypeScript modules
- **Test Coverage**: 77 test cases, 100% pass rate
- **Database Tables**: 2 with 7 indexes

---

## 🚀 Upgrade Instructions

### For Global Installation:

```bash
npm update -g openai-gpt-image-mcp-server
```

### For Local Installation:

```bash
cd openAI-gpt-image-1-MCP-SERVER
git pull
npm install
npm run build
```

### Configuration Changes

No configuration changes required! The new features work automatically:
- History database is created on first use at `~/.openai-gpt-image/history.db`
- All existing tools continue to work exactly as before
- New parameters (like `sample_count`) are optional with sensible defaults

### Optional Environment Variables

You can customize the database location:

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "HISTORY_DB_PATH": "/custom/path/to/history.db"
      }
    }
  }
}
```

---

## 🔄 Breaking Changes

**None!** This release is fully backward compatible with v1.0.2.

All existing functionality remains unchanged:
- All existing tools work identically
- All parameters have the same defaults
- No API changes to existing features

---

## 📚 Documentation Updates

### New Documents
- **NEW_TOOLS_GUIDE.md**: Comprehensive guide to v1.0.3 features
  - Detailed tool documentation
  - Usage examples
  - Response format samples
  - Technical specifications

### Updated Documents
- **CLAUDE.md**: Updated with new features and tool definitions
- **README.md**: Added advanced features section
- **TEST_REPORT.md**: Complete test results for all 77 test cases

---

## 🐛 Bug Fixes

- Fixed variable declaration order in metadata embedding
- Improved error messages for job operations
- Enhanced path handling for cross-platform compatibility

---

## 🎯 Performance Improvements

- SQLite WAL mode for concurrent read/write operations
- Indexed database queries for fast history searches
- Efficient batch processing for multi-image generation
- Background job execution doesn't block main thread

---

## 🔮 Future Enhancements

Planned for upcoming releases:
- Image variation generation
- Batch job scheduling
- Cost analytics and reporting
- Custom style presets
- Export/import history

---

## 📝 Migration Guide

### From v1.0.2 to v1.0.3

**Step 1**: Update the package
```bash
npm update -g openai-gpt-image-mcp-server
```

**Step 2**: Restart Claude Desktop or Claude Code

**Step 3**: Start using new features immediately!

**Example: Generate Multiple Images**
```
Generate 5 variations of a sunset landscape
```

**Example: View History**
```
Show me the last 10 images I generated
```

**Example: Start Background Job**
```
Start a background job to generate 10 high-quality space images
```

---

## 🙏 Acknowledgments

Special thanks to:
- The Model Context Protocol team
- OpenAI for the gpt-image-1 API
- The Claude Desktop and Claude Code teams
- All users who provided feedback and feature requests

---

## 📞 Support

- **Documentation**: See CLAUDE.md and NEW_TOOLS_GUIDE.md
- **Issues**: Report at GitHub repository
- **Examples**: Check the updated README.md

---

## 📅 Release Timeline

- **v1.0.0** (Initial Release): Basic image generation
- **v1.0.1** (Bug Fix): API parameter fixes
- **v1.0.2** (Enhancement): Improved error handling
- **v1.0.3** (Major Update): History, async jobs, metadata

---

**Released**: October 16, 2025
**Build**: 1.0.3
**Status**: Stable

**🎨 Happy Image Generating! 🚀**
