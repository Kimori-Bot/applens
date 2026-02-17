# AppLens SDK - Technical Specification

## Overview
AI-powered SDK that enables autonomous app navigation and review.

## Architecture
- AI Agent → AppLens Cloud API → AppLens SDK (in target app)
- SDK reports component tree, executes navigation commands

## SDK API
- trackScreen(name)
- trackElement(id, type, label)
- getComponentTree()
- executeAction(action)
- captureScreenshot()

## Supabase Schema
- organizations, apps, review_sessions, screenshots, issues tables

## Week 1 Goals
1. SDK with basic tracking
2. Simple dashboard
3. Supabase integration
4. Demo app with SDK
5. Testable by Kevin
