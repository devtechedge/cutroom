# ADR 0001: Project file v2 embeds image assets

Status: accepted

Date: 2026-10-24

## Context

Project JSON v1 serialized only the storyboard. Images lived in IndexedDB under asset IDs, so exporting and importing on another machine lost the images.

## Decision

Project files use `format: "cutroom-project"` and `schemaVersion: 2` with a `storyboard` object and an `assets` array containing only referenced assets. Imports validate assets, persist them, and remap IDs. Version 1 files remain readable with a warning.

## Consequences

Files are larger when they contain images. The 25 MB cap keeps exports and imports bounded. The IndexedDB board schema stays version 1, so existing local boards keep loading without a migration.
