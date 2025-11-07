# EV Connect Design Guidelines

## Design Approach

**Hybrid System-Reference Approach:** Primary foundation using Material Design principles (suitable for data-heavy applications with strong visual feedback), enhanced with references to:
- **Linear:** Clean utility interfaces, refined typography, smart spacing
- **Reddit/Twitter:** Social feed patterns, engagement mechanics
- **Google Maps:** Map UI conventions for familiarity

This approach balances the platform's dual nature: professional utility tools meet engaging social experience.

## Typography

**Font System (Google Fonts):**
- Primary: Inter (UI, body text, forms) - weights: 400, 500, 600, 700
- Display: Outfit (headings, hero sections) - weights: 600, 700

**Hierarchy:**
- Hero/Page titles: text-5xl to text-6xl, font-bold, Outfit
- Section headers: text-3xl, font-semibold, Outfit
- Card titles: text-xl, font-semibold, Inter
- Body text: text-base, font-normal, Inter
- Captions/metadata: text-sm, font-medium, Inter
- Small labels: text-xs, uppercase tracking-wide

## Layout & Spacing System

**Tailwind Spacing Primitives:** Limit to 2, 3, 4, 6, 8, 12, 16, 20, 24 units
- Tight spacing: p-2, gap-3, m-4 (within components)
- Standard spacing: p-6, gap-6, my-8 (between elements)
- Section spacing: py-12 to py-20 (major page sections)
- Container: max-w-7xl mx-auto px-4

**Grid System:**
- Feed layouts: Single column mobile, 2-col tablet (md:), 3-col desktop (lg:) for cards
- Admin tables: Full-width responsive with horizontal scroll
- Map + sidebar: 2-col split (1:2 ratio) on desktop, stacked mobile

## Core Components

### Navigation
**Top Navigation Bar:**
- Fixed header, backdrop-blur-lg with subtle shadow
- Logo left (EV Connect with lightning icon), search center (expandable on focus), user menu + notifications right
- Primary nav links: Feed, Communities, Map, Q&A, Knowledge (hidden on mobile, hamburger menu)
- Mobile: Bottom tab bar with icons for core features

### Hero Sections
**Landing/Marketing Pages:**
- Full-width hero with gradient overlay on background image
- Height: min-h-[600px] on desktop, min-h-[500px] mobile
- Centered content: Large headline (text-5xl md:text-6xl), supporting text (text-xl), dual CTA buttons with blur background
- Hero image: Modern EV at charging station, urban/tech aesthetic

### Map Interface
**Station Finder:**
- Split layout: Map (70%) + Sidebar (30%) on desktop
- Map toolbar: Floating top-left with search radius, connector filters, power level chips
- Station markers: Custom icons (color-coded by availability - use Font Awesome charging-station icon)
- Info windows: Station name, address, connector types with icons, "Bookmark" + "Navigate" buttons
- Sidebar: Scrollable list of stations with distance, quick details, expandable cards
- Mobile: Stacked - filters top, map middle (400px), list bottom

### Social Feed Components
**Post Card:**
- White background, rounded-xl, shadow-sm hover:shadow-md transition
- Header: Avatar (40px circle), username, timestamp, community badge (if posted to community), three-dot menu
- Content: Text (max 4 lines preview, "Read more"), media grid (1-4 images, aspect-ratio-square or video player)
- Footer: Like count + button (heart icon), comment count + button (chat icon), bookmark icon
- Padding: p-4 to p-6

**Post Composer:**
- Prominent textarea with placeholder "Share your EV experience..."
- Media upload zone with Cloudinary widget (drag-drop + click)
- Bottom bar: Emoji picker, image/video buttons, community selector dropdown, visibility toggle, "Post" button (primary)

### Community Components
**Community Card:**
- Horizontal card with cover image left (200px width), content right
- Cover image: Brand logo or region photo
- Content: Community name (text-2xl), member count badge, description (2 lines), "Join" button (or "Joined" state with checkmark)

**Community Page:**
- Hero banner: Cover image (h-48) with community name overlay, member count, moderator avatars
- Tabs: Posts, About, Members
- Join/Leave button (sticky on mobile)

### Q&A Components
**Question Card:**
- Border-left accent (4px width)
- Title (text-lg font-semibold), tags (rounded-full badges), author + timestamp
- Excerpt: First 2 lines of body
- Footer: Upvote count + button (arrow-up icon), answer count, "Solved" badge (if applicable, green checkmark)

**Question Detail Page:**
- Full question with rich text body, tags at top
- Answer list: Sorted by upvotes, accepted answer highlighted (green border, checkmark icon)
- Each answer: Author card, body, upvote button, "Accept" button (for question author)

### Admin Dashboard
**Overview Cards:**
- 4-col grid (1-col mobile): Total users, active communities, pending reports, verified stations
- Each card: Large number (text-4xl), label, trend indicator (arrow + percentage), icon

**Data Tables:**
- Striped rows, hover state
- Column headers: Sortable (with arrow icons)
- Actions column: Icon buttons (view, edit, delete)
- Bulk actions: Top toolbar with checkbox select-all, action dropdown
- Pagination: Bottom-centered with page numbers + prev/next

### Forms
**Consistent Form Design:**
- Labels: text-sm font-medium, mb-1
- Inputs: Border (2px), rounded-lg, p-3, focus:ring-2 focus:outline-none
- Textareas: min-h-32, resize-y
- Select dropdowns: Custom styled with chevron icon
- Checkbox/Radio: Larger hit areas (p-4 wrapper), custom styled
- Error states: Red border + text-sm error message below
- Success states: Green border + checkmark icon
- Submit buttons: w-full on mobile, inline on desktop

### Station Cards
**Station List Item:**
- Horizontal layout: Icon left (connector type icon, 48px), content center, distance right
- Content: Station name (font-semibold), address (text-sm text-muted), connector chips (small rounded badges showing type + power)
- Footer: Provider name, pricing indicator, availability dot (green/yellow/red)
- Bookmark icon (top-right)

### Article/News Cards
**Featured Article (Hero):**
- Large card: Image (aspect-ratio-16/9), gradient overlay, title + summary overlaid (bottom-left), category badge (top-left)
- Click to detail page

**Article List:**
- Grid: 2-col tablet, 3-col desktop
- Each card: Image top, category badge, title, summary (2 lines), author + date, "Read more" link

## Images

**Key Image Placements:**
- Landing hero: High-quality EV charging scene (1920x1080)
- Community covers: Brand logos or regional landmarks (600x300)
- Station photos: User-submitted charging station images (400x300)
- Article covers: EV news/tech imagery (800x450)
- User avatars: Circular, 40px default, 80px profile page

**Image Treatment:**
- Rounded corners: rounded-lg for cards, rounded-xl for heroes
- Lazy loading for all images
- Placeholder: Subtle gradient or icon while loading

## Accessibility & Interaction

- Focus states: 2px ring with offset
- Touch targets: Minimum 44px height for interactive elements
- Icon buttons: Include aria-labels
- Form validation: Real-time + submit validation with clear messaging
- Loading states: Skeleton screens for feeds, spinners for actions
- Empty states: Illustrations + helpful text + primary action
- Animations: Minimal - smooth page transitions (200ms), hover scale (1.02), fade-in on scroll

## Responsive Breakpoints

- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (2-col grids, condensed sidebar)
- Desktop: > 1024px (full layouts, 3-col grids)

**Mobile Optimizations:**
- Collapsible filters (drawer from bottom)
- Sticky "Create Post" FAB (bottom-right)
- Swipeable cards for Q&A and articles
- Full-screen map with slide-up station list

---

**Design Philosophy:** Clean, modern, data-forward interface that makes EV charging effortless while fostering community. Prioritize information clarity over decoration, but maintain warmth through imagery and micro-interactions.