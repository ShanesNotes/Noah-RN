# Noah RN

Clinical decision support and structured nursing workflows for bedside nurses.

A Claude Code plugin encoding 13 years of critical care expertise into structured, repeatable, prompt-driven clinical workflows.

## Status

**Phase 0: Scaffold** — plugin structure exists, manifest valid, test skill working.

## Quick Start

```bash
# Validate the plugin
claude plugin validate ./plugin

# Load the plugin for a session
claude --plugin-dir ./plugin

# Test the skill
# Type: /noah-rn:hello-nurse
```

## Project Structure

```
noah-rn/
├── plugin/             # The installable Claude Code plugin
│   ├── .claude-plugin/ # Plugin manifest
│   ├── skills/         # Clinical skills (the core product)
│   ├── agents/         # Clinical agents
│   ├── commands/       # Slash commands
│   └── hooks/          # Guardrails
├── tools/              # Deterministic tool implementations
├── knowledge/          # Curated clinical reference data
├── docs/               # Architecture and documentation
└── tests/              # Test suite
```

## Disclaimer

Noah RN is a clinical decision support tool, not a medical device. It is not a substitute for clinical judgment. Verify all information against your facility's policies and current patient data.
