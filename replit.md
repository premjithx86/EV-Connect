# EV Connect - Electric Vehicle Community Platform

## Project Overview
EV Connect is a comprehensive full-stack social networking and utility platform for electric vehicle users. Built with React, Express, and TypeScript, it combines social features (posts, communities, Q&A) with practical tools (charging station finder via Open Charge Map API).

## Architecture
- **Frontend**: React + Vite, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Data Layer**: In-memory storage (MemStorage) with interfaces for all entities
- **Authentication**: JWT-based auth with httpOnly cookies, bcrypt password hashing
- **API Integration**: Open Charge Map API for charging station data

## Key Features Implemented

### Authentication & Authorization
- JWT-based authentication with secure httpOnly cookies (sameSite=strict for CSRF protection)
- Role-based access control (USER, MODERATOR, ADMIN)
- Registration and login with password hashing (bcrypt)
- Auth context provider for frontend state management

### Social Features
- User profiles with EV vehicle information
- Posts with likes, comments, and media support
- Communities by brand/interest with join/leave functionality
- Feed system with filtering by community/author

### Q&A Forum
- Questions with tags, upvoting, and solved status
- Answers with upvoting system
- Question author can mark answers as solved

### Charging Station Features
- Integration with Open Charge Map API for real-time station search
- Station bookmarking system
- User-contributed stations
- Search by location, distance, and country

### Knowledge Hub
- Articles categorized as NEWS, TIPS, or KNOWLEDGE
- Tags and filtering
- Admin-only CMS for article creation

### Content Moderation
- Report system for posts, comments, users
- Moderator dashboard for handling reports
- Audit logs for admin actions
- User status management (active/suspended)

## Backend API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profiles/:userId` - Get user profile
- `PUT /api/profiles` - Update own profile

### Posts
- `GET /api/posts` - List posts (query: communityId, authorId, limit, offset)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (auth required)
- `POST /api/posts/:id/like` - Toggle like (auth required)
- `DELETE /api/posts/:id` - Delete post (auth required, own posts or admin/mod)

### Comments
- `GET /api/posts/:postId/comments` - List comments for post
- `POST /api/posts/:postId/comments` - Create comment (auth required)
- `DELETE /api/comments/:id` - Delete comment (auth required)

### Communities
- `GET /api/communities` - List communities (query: search, type)
- `GET /api/communities/:id` - Get community details
- `POST /api/communities` - Create community (admin only)
- `POST /api/communities/:id/join` - Join community (auth required)
- `POST /api/communities/:id/leave` - Leave community (auth required)
- `GET /api/communities/:id/is-member` - Check membership (auth required)

### Stations
- `GET /api/stations` - List user-added stations
- `GET /api/stations/search` - Search Open Charge Map API (query: lat, lng, distance, countryCode, maxResults)
- `GET /api/stations/:id` - Get station details
- `POST /api/stations` - Add new station (auth required)

### Bookmarks
- `GET /api/bookmarks` - Get user's bookmarks (auth required, query: targetType)
- `POST /api/bookmarks` - Create bookmark (auth required)
- `DELETE /api/bookmarks/:id` - Delete bookmark (auth required)
- `GET /api/bookmarks/check/:targetId` - Check if bookmarked (auth required)

### Questions & Answers
- `GET /api/questions` - List questions (query: tag, sort, limit, offset)
- `GET /api/questions/:id` - Get question details
- `POST /api/questions` - Create question (auth required)
- `POST /api/questions/:id/upvote` - Toggle upvote (auth required)
- `POST /api/questions/:id/solve` - Mark answer as solving (auth required, question author only)
- `GET /api/questions/:questionId/answers` - List answers
- `POST /api/questions/:questionId/answers` - Create answer (auth required)
- `POST /api/answers/:id/upvote` - Toggle answer upvote (auth required)

### Articles
- `GET /api/articles` - List articles (query: kind, tag, limit)
- `GET /api/articles/:id` - Get article
- `POST /api/articles` - Create article (admin only)

### Reports & Moderation
- `GET /api/reports` - List reports (moderator only, query: status, limit)
- `POST /api/reports` - Create report (auth required)
- `PUT /api/reports/:id` - Update report status (moderator only)

### Admin
- `GET /api/audit-logs` - View audit logs (admin only, query: limit)
- `PUT /api/admin/users/:id` - Update user role/status (admin only)

## Demo Data & Seeding

Demo accounts and content can be seeded by running with `SEED_DATA=true`:
```bash
SEED_DATA=true npm run dev
```

### Demo Accounts
- `alice@evconnect.com` / `password123` (USER)
- `bob@evconnect.com` / `password123` (USER)
- `carol@evconnect.com` / `password123` (MODERATOR)
- `admin@evconnect.com` / `password123` (ADMIN)

Seed data includes:
- 4 users with profiles and EV vehicle info
- 4 communities (Tesla Owners, EV Charging Tips, Long Range Drivers, Budget EVs)
- 5 posts with likes and comments
- 3 charging stations
- 3 Q&A questions with answers
- 3 knowledge articles

## Design System

### Typography
- **Headings/Display**: Outfit font family
- **Body/UI**: Inter font family
- **Scale**: Responsive with clear hierarchy

### Colors
- **Primary**: Green theme (#10b981 family) representing sustainability
- **Background**: Clean white/dark mode support
- **Accents**: Subtle grays for UI elements

### Components
- Built with shadcn/ui component library
- Consistent spacing and borders
- Hover states with elevation system
- Dark mode fully supported

### Layout Patterns
- Material Design influenced
- Card-based content display
- Responsive grid layouts
- Mobile-first approach

## Frontend State Management
- `@tanstack/react-query` for server state
- Auth context for user session
- Theme context for dark mode
- No global state management library needed

## Security Features
- Password hashing with bcrypt (10 rounds)
- JWT tokens with 7-day expiry
- HttpOnly cookies with sameSite=strict (CSRF protection)
- Secure flag in production
- Role-based access control
- Input validation with Zod schemas
- Audit logging for sensitive actions

## Storage Layer Invariants
- Community membership uniqueness enforced
- Station bookmark counts automatically maintained
- Comment counts on posts auto-updated
- Answer counts on questions auto-updated
- Member counts on communities auto-updated

## Development Notes

### Running the App
```bash
npm run dev
```
Server runs on port 5000 (both API and frontend served together)

### Optional Environment Variables
- `SEED_DATA=true` - Seed demo data on startup
- `OPEN_CHARGE_MAP_API_KEY` - API key for Open Charge Map (optional, works without it)
- `SESSION_SECRET` - JWT signing secret (defaults to dev secret)
- `NODE_ENV` - Set to "production" for secure cookies

### Frontend Development
- All API requests use `credentials: "include"` for cookie auth
- Auth is handled via AuthContext/useAuth hook
- Forms use react-hook-form with Zod validation
- Loading/error states managed by React Query

### Testing Strategy
- Backend routes can be tested with curl/Postman
- Frontend features can be e2e tested with playwright
- Demo data provides realistic test scenarios

## Next Steps / Future Enhancements
- Database migration from in-memory to PostgreSQL
- File upload for avatars and post media
- Real-time updates with WebSockets
- Push notifications
- Email verification
- Password reset flow
- Advanced search and filtering
- Map view for stations
- Trip planning features
- Social features: followers, direct messaging
- Mobile app (React Native)

## Recent Changes (Last updated: 2025-11-07)
- ✅ Complete backend API implementation
- ✅ JWT authentication with secure cookies
- ✅ Role-based access control
- ✅ Open Charge Map API integration
- ✅ Seed data script
- ✅ Auth context and login page
- ⏳ Frontend integration (in progress - auth working, need to wire up data fetching)
