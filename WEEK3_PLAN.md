# AppLens Week 3 Plan - AI-Powered Features

## Overview
Week 3 adds AI-powered intelligence to AppLens - automated issue analysis, UX scoring, and smart recommendations.

---

## Feature Ideas (Brainstorm)

### 1. AI Issue Summaries ✅ SELECTED
- Uses LLM to analyze all issues in a session
- Groups similar issues
- Provides root cause analysis
- Recommends fixes

### 2. Automatic UX Ratings
- AI scores UX from 1-10 based on:
  - Navigation flow smoothness
  - Issue density
  - Session completion
- Generates actionable feedback

### 3. Video Replay
- Converts screenshots to video
- Shows session as a playback
- Annotates events on timeline

### 4. Version Comparison
- Side-by-side session comparison
- Shows what changed between versions

### 5. Real-time Collaboration
- Multiple users review same session
- Live cursors and annotations

---

## Selected Feature: AI Issue Summaries

### Implementation Approach
1. Add `POST /api/session/:id/ai-summary` endpoint
2. Collect all issues, screens, and elements for session
3. Send to local Ollama LLM (`minimax-m2.5:cloud`)
4. Parse and return AI analysis

### AI Summary Output
```json
{
  "summary": "The app has 3 critical UX issues...",
  "categories": {
    "navigation": 2,
    "ui_bug": 1,
    "performance": 0
  },
  "severity_breakdown": {
    "critical": 1,
    "high": 1,
    "medium": 2
  },
  "recommendations": [
    "Fix the tap target size on the submit button",
    "Add loading state during API calls"
  ],
  "root_causes": [
    "Missing error handling in async operations",
    "Insufficient touch target sizes"
  ]
}
```

### Files to Modify
- `server/index.js` - Add AI summary endpoint

---

## UX Rating Feature (Bonus)

### Rating Criteria
- **Navigation Score** (0-10): How intuitive was the flow?
- **Stability Score** (0-10): Any crashes or freezes?
- **Issue Density** (0-10): Lower is better
- **Completion Score** (0-10): Did user complete goals?

### AI Rating Prompt
The LLM will analyze session data and output scores with explanations.

---

## Progress

- [x] Plan features
- [ ] Implement AI summary endpoint
- [ ] Add UX rating endpoint
- [ ] Add UI buttons in dashboard
- [ ] Test with sample data
- [ ] Push to GitHub