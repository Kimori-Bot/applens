# AppLens UX Plan - Dashboard User Flow

## Overview

AppLens is a developer tool where the end-user (developer) integrates an SDK into their app. The SDK sends data automatically—no manual session creation needed. The dashboard is for reviewing captured sessions.

**Core Philosophy:** "It just works" — the SDK does the heavy lifting; the dashboard should be calm, clean, and focused on reviewing.

---

## 1. First-Time Experience (Empty State)

### What Users See Initially
When a user first opens the dashboard with no connected apps:

**Option A (Recommended - Zero Friction):**
- Show a **welcoming empty state** with a clear call-to-action
- Simple, friendly message: *"Get started by adding the SDK to your app"*
- One-click copy for installation commands
- No account/project creation required initially

```
┌─────────────────────────────────────────────────────┐
│                    🔬 AppLens                       │
│                                                     │
│   Welcome to AppLens! To start capturing           │
│   app sessions, add our SDK to your app:           │
│                                                     │
│   npm install @applens/react-native                │
│                                                     │
│   [Copy Installation Command]                       │
│                                                     │
│   Once integrated, sessions will appear here       │
│   automatically when you run your app.             │
│                                                     │
│   📚 Read the Docs    ⚡ Quick Start Guide          │
└─────────────────────────────────────────────────────┘
```

**Why:** Developers hate friction. Don't make them create a "project" before seeing value. Let the first app connect seamlessly.

### After First SDK Connection
When the SDK first connects and creates a session:

- **Toast notification:** *"New session started from [App Name]"*
- Session appears in the list with status: **Active** (pulsing indicator)
- User can click to enter review mode immediately

---

## 2. App/Project Management

### Do Users Need to Create Projects First?

**Short answer:** No—not for the MVP. The SDK should handle this.

### Recommended Flow:

1. **Auto-registration:** When SDK first connects with an `appId`, auto-create the app entry in the database
2. **First session = first app record:** No manual setup required
3. **Dashboard shows list of connected apps** (grouped from sessions)

```
┌─────────────────────────────────────────────────────┐
│  Your Apps                      [+ Add New App]     │
├─────────────────────────────────────────────────────┤
│  🎯 MyTipCalculator     3 sessions • Last: 2h ago  │
│  📱 MyFoodDelivery     12 sessions • Last: 1d ago  │
│  🛒 ShopDemoApp        0 sessions                  │
└─────────────────────────────────────────────────────┘
```

### App Settings (When Needed)
Users can click an app to view/modify:
- App name & icon (auto-detect or manual set)
- API key regeneration
- Delete app
- (MVP: just show name, allow rename)

---

## 3. Session Review Flow

### Starting a Review Session

**No button needed** — sessions start automatically when:
1. App with SDK is launched
2. User navigates around the app
3. SDK captures screen transitions and elements

### Entering a Session

1. **Session list view** shows all sessions (newest first)
2. Each session card shows:
   - App name
   - Duration
   - Number of screens visited
   - Issue count badge (if any)
   - Timestamp

```
┌─────────────────────────────────────────────────────┐
│  MyTipCalculator Sessions                           │
├─────────────────────────────────────────────────────┤
│  ● Active       5 screens • Just now                │
│  ✓ Completed    12 screens • 2 issues • 2h ago     │
│  ✓ Completed    8 screens • 4 issues • Yesterday   │
└─────────────────────────────────────────────────────┘
```

### In-Session Review

Click a session to enter **Review Mode**:

```
┌─────────────────────────────────────────────────────┐
│ ← Back    Session: MyTipCalculator    📤 Share    │
├──────────┬──────────────────────────────────────────┤
│ Screens  │                                          │
│          │    ┌─────────────────┐                   │
│ Home  ✓  │    │                 │                   │
│ Paywall  │    │   🖼️ Screen     │                   │
│ Settings │    │    Screenshot   │                   │
│          │    │                 │                   │
│ Filters: │    └─────────────────┘                   │
│ □ Bugs   │                                          │
│ □ UX     │   [Tap elements to see info]            │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│ [+ Add Issue]            🔍 Element Inspector       │
└─────────────────────────────────────────────────────┘
```

**Key interactions:**
- Click screen thumbnail → view full screenshot with overlay markers
- Markers show tracked elements (tap to see element details)
- Red markers = reported issues; blue = tracked elements
- [+ Add Issue] → click anywhere on screenshot to mark a problem

---

## 4. Sharing with Teammates/Clients

### Team Collaboration

**Simple sharing flow:**
1. **Share button** in session header
2. Options:
   - **Copy link** (for logged-in team members)
   - **Generate shareable link** (view-only, no login needed)
   - **Invite teammate by email**

### Share Settings Per Session

```
┌──────────────────────────────────────┐
│ Share Session                        │
├──────────────────────────────────────┤
│ 🔗 Share Link (anyone with link)    │
│    [Copy] https://applens.io/s/abc123│
│                                      │
│ ○ View only (default)                │
│ ○ View + comment                     │
│ ○ Full access                        │
│                                      │
│ ⏰ Link expires: Never ▼             │
│    (Never / 1 day / 1 week / Custom) │
│                                      │
│         [Cancel]  [Create Link]      │
└──────────────────────────────────────┘
```

### Client Review (External Sharing)

For sharing with clients who don't have accounts:
- Generates a **public link** with optional password
- Limited view: can see screenshots, add comments
- Cannot see SDK details/raw data
- Optional: watermark with client name

---

## 5. Anonymous/Public Reviews

### Use Cases
- **Beta testing:** Send to testers without them needing accounts
- **Client demos:** Show progress without full access
- **Bug reports:** Let anyone flag issues

### Implementation

**"Anonymous Review Mode"** - toggle per session:

1. Enable anonymous access in session settings
2. Generates a unique public URL:
   ```
   https://applens.io/public/review/xyz789
   ```
3. No login required—just open link

**What anonymous reviewers can do:**
- View all screenshots with element markers
- Add comments/annotations on screenshots
- Report issues (with categorization: Bug, UX, Feature Request)
- (Optional) Add free-text feedback

**What they CAN'T do:**
- See raw component tree
- Access API/make changes
- See other sessions/apps

### Anonymous Review Landing Page

For public links, show a clean no-account-required page:

```
┌─────────────────────────────────────────────────────┐
│  🔬 AppLens Review               Powered by AppLens │
│                                                     │
│  You're reviewing: MyTipCalculator                 │
│  Session date: Feb 18, 2026                        │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │           📱 Screenshot 1                   │   │
│  │                                             │   │
│  │           📱 Screenshot 2                   │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Share your feedback:                              │
│                                                     │
│  [What issues did you find?  Type here...]        │
│                                                     │
│  [Submit Feedback]          👤 Add as Guest        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 6. Quick Summary - User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW USER FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Open Dashboard                                         │
│     ↓                                                       │
│  2. See Empty State → Copy SDK install command             │
│     ↓                                                       │
│  3. Integrate SDK into their app                           │
│     ↓                                                       │
│  4. Run their app → SDK auto-connects → Session created    │
│     ↓                                                       │
│  5. Dashboard shows new session (toast notification)       │
│     ↓                                                       │
│  6. Click session → Review screenshots → Mark issues       │
│     ↓                                                       │
│  7. Share via link or invite team                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. MVP Priority Checklist

### Must Have (MVP)
- [x] SDK auto-creates sessions ✓ (existing)
- [ ] Empty state with install instructions
- [ ] Session list (auto-populated)
- [ ] Review mode with screenshot view
- [ ] Basic sharing (copy link)
- [ ] Public/anonymous review links

### Should Have (Post-MVP)
- [ ] App management (rename, delete)
- [ ] Team invites
- [ ] Issue tracking/filtering
- [ ] Session comparison
- [ ] Export reports

### Nice to Have
- [ ] Password-protected public links
- [ ] Client-specific branding/watermark
- [ ] Real-time collaboration
- [ ] Video playback of sessions

---

## 8. Wireframe: Main Dashboard (MVP)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔬 AppLens                                           [User Avatar] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Your Apps                                   [+ Register New App]    │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ 🎯 MyTipCalc   │  │ 📱 FoodDelivery│  │ 🛒 ShopApp    │        │
│  │ 3 sessions    │  │ 12 sessions    │  │ + Connect SDK │        │
│  │ Last: 2h ago  │  │ Last: 1d ago   │  │ to get started│        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│  Recent Sessions                                                   │
│                                                                      │
│  ● Active ─ MyTipCalc ─ 5 screens ─ Just now              [Review] │
│  ✓ Done  ─ MyTipCalc ─ 12 screens ─ 2 issues ─ 2h ago     [Review] │
│  ✓ Done  ─ FoodDelivery ─ 8 screens ─ 5 issues ─ 1d ago   [Review] │
│                                                                      │
│  ─────────────────────────────────────────────────────              │
│  📊 Analytics (coming soon)                                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Question | Answer |
|----------|--------|
| First open? | Friendly empty state with SDK install guide |
| Create projects first? | **No** — auto-created on first SDK connection |
| Start review session? | **Don't need to** — auto-starts when SDK connects |
| Share with team? | Copy link, or invite by email |
| Anonymous reviews? | Generate public link — anyone can view/add feedback |

**Philosophy:** The dashboard should feel like a calm observatory. The developer adds the SDK, and the sessions simply appear. The UX focuses on **easy discovery, smooth review, and frictionless sharing**.