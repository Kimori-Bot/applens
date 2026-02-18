# AppLens CEO Plan

## Product Vision

AppLens is an SDK that enables developers to add AI-powered app review capabilities to their React Native/Expo applications. By capturing screens and element trees, we empower AI agents to autonomously navigate apps and humans to review screenshots for debugging, UX analysis, and quality assurance.

---

## Week 1 MVP Feature Set

### 1. SDK - Basic Screen & Element Tracking
- **Screen Tracking**: Automatically capture screen names/views on navigation
- **Element Tree Capture**: Extract UI component hierarchy (type, props, accessibility labels)
- **Session Management**: Track user sessions with unique identifiers
- **Local Buffer**: Store captures temporarily before sync
- **Basic Configuration**: Enable/disable tracking, sample rate

### 2. Supabase Integration
- **Data Schema**: Tables for sessions, screens, elements, captures
- **API Client**: SDK methods to push data to Supabase
- **Simple Auth**: API key-based authentication

### 3. Dashboard - Basic Viewer
- **Session List**: View captured sessions
- **Screen Gallery**: See captured screenshots
- **Element Inspector**: View element tree for each capture
- **Basic Filtering**: By date, session ID

### 4. Demo App - TipCalculator
- Simple tip calculator built with Expo
- AppLens SDK pre-integrated
- Testable end-to-end by Kevin

---

## Product Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Core SDK with screen + element tracking
- [ ] Supabase backend integration
- [ ] Basic dashboard viewer
- [ ] Demo app (TipCalculator)

### Phase 2: Enhancement (Week 2-3)
- [ ] Real-time sync improvements
- [ ] Element diffing (capture changes between screens)
- [ ] Search & filtering in dashboard
- [ ] SDK configuration UI in dashboard

### Phase 3: AI Ready (Week 4+)
- [ ] Element naming/labeling for AI agents
- [ ] Navigation API for AI agents
- [ ] Element action simulation (tap, type, scroll)
- [ ] Analytics & insights dashboard

### Phase 4: Scale (Month 2+)
- [ ] Multi-platform support (iOS native, web)
- [ ] Team collaboration features
- [ ] Export capabilities (JSON, CSV)
- [ ] Custom integrations (Slack, Jira)

---

## Success Metrics

### Primary Metrics (Week 1)
| Metric | Target |
|--------|--------|
| SDK Bundle Size | < 100KB |
| Demo App Capture Rate | 100% of screen navigations |
| Kevin's Test Success | All 5 screens captured correctly |
| Dashboard Load Time | < 2 seconds |

### Secondary Metrics
- **Adoption Readiness**: SDK has clear documentation and TypeScript types
- **Data Integrity**: All captured elements have valid hierarchy
- **Developer Experience**: < 5 minute integration time for basic setup

### North Star Metric
**"Time from SDK install to first captured screenshot"** — Target: < 10 minutes

---

## Landing Page Hero Text

> **AppLens**
> *Give your app an AI memory.*
>
> Capture every screen, every element, every moment. AppLens makes your React Native/Expo app observable — so AI agents can navigate it and humans can review it.
>
> Built for developers who want:
> - 🔍 **Instant Debugging** — See what users see, in real-time
> - 🤖 **AI-Powered Automation** — Let agents test and explore your app
> - ⚡ **Zero Friction** — Add in one line of code
>
> [Get Started Free] · [View Demo]
>
> *Ship better apps. Let AI do the exploring.*

---

## Key Decisions Made

1. **Supabase First**: Using Supabase for rapid MVP development instead of building custom backend
2. **Expo Focus**: Targeting Expo/React Native first for fastest time-to-market
3. **SDK-First**: Dashboard is secondary; SDK quality is paramount for developer adoption
4. **Kevin as First User**: Designing the MVP around Kevin's testability requirements

---

*Document prepared: 2026-02-18*
*Next review: End of Week 1*
