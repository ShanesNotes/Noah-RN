# Graphify Helpers

This folder holds repo-local helpers for choosing the Graphify corpus boundary before a rebuild.

## Why this exists

`noah-rn` has two legitimate graph shapes:

- **canonical-project**
  - focuses on active project surfaces
  - excludes local grounding surfaces that can dominate the graph
- **full-context**
  - includes local grounding surfaces such as `wiki/`, `research/`, `notes/`, and `docs/local/`
  - useful when you explicitly want synthesis and research to shape the graph

The main practical issue is `wiki/`: it is dense, highly linked, and can outweigh ordinary repo files in centrality/community structure.

## Profiles

- `profiles/canonical-project.graphifyignore`
  - excludes `wiki/`, `research/`, `notes/`, and `docs/local/`
- `profiles/full-context.graphifyignore`
  - keeps those local grounding surfaces in the corpus

## Use

```bash
tools/graphify/set-profile.sh canonical-project
tools/graphify/set-profile.sh full-context
```

This copies the chosen profile into repo-root `/.graphifyignore` and backs up the previous file into `local/graphify/backups/`.

## Recommended default

For a canonical architecture graph, use:

```bash
tools/graphify/set-profile.sh canonical-project
```

For a synthesis-heavy graph that intentionally includes the Obsidian/wiki layer, use:

```bash
tools/graphify/set-profile.sh full-context
```
