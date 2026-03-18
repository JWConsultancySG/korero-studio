
# Korero — K-pop Dance & Singing Studio App

## Design System
- **Colors**: Primary `#4E1A88` (purple), black, white, grey. Subtle purple glow/gradient accents.
- **Typography**: Helvetica, bold large headings, clear hierarchy
- **Style**: Mobile-first, card-based layouts, big buttons, sticky CTAs, progress indicators
- **Animations**: Subtle scale/fade transitions, button press effects
- **Microcopy**: Gen Z-friendly ("Let's go 🔥", "You're in! 🎉", "Almost there!")

## Pages & Features

### 1. Landing / Home Page
- Hero with studio branding, tagline, and CTA "Join a Song Group 🔥"
- Quick intro cards showing what Korero offers

### 2. Student Registration (Single Screen)
- Minimal form: Name, WhatsApp, Email
- Big "Join a Song Group" submit button
- Stores student in local state/context for the session

### 3. Song Group Listing
- Scrollable card list showing: song title, interest count, status (forming/confirmed)
- "Join" button on each card, "Create New Group" floating action button
- Visual badges for status

### 4. Create New Song Group
- Simple modal/screen: enter song name → submit for approval
- Shows "Pending Approval ⏳" status immediately

### 5. Guided Booking Flow (Step-by-step with progress bar)
- **Step 1**: Select availability (time slot picker)
- **Step 2**: Role selection (Main Vocal, Dancer, etc.) with real-time availability, 30-min hold timer, clear taken/available states
- **Step 3**: Payment — Stripe & PayNow simulation with amount display and status
- **Step 4**: Booking confirmation — success screen with class info, role, time, "Done" / "View My Classes" CTAs

### 6. Post-Payment Follow-Up
- Optional short feedback/preferences form after confirmation

### 7. My Classes Page
- List of student's booked classes with details

### 8. Admin Dashboard (password-gated)
- Simple password entry to access
- Overview cards: total groups, interest counts, alerts
- Song approval: approve/reject pending songs
- Song library & class management
- Studio room calendar (2 rooms, visual weekly layout)
- Availability matcher: see student overlaps, suggest best class times
- Trigger class confirmation (simulated WhatsApp notification)

## Data & State
- All data mocked in React context/state (no backend)
- Prepared data models for future Supabase integration
- Mock payment flow (simulated success)

## Navigation
- Bottom tab bar (mobile): Home, Groups, My Classes
- Admin accessed via settings/hidden link with password gate
- Step-by-step flow uses linear navigation with back/progress bar

## Tech
- React + TypeScript + Tailwind + shadcn/ui
- Framer Motion for animations
- React Router for navigation
- Context API for state management
- Mobile-first responsive design
