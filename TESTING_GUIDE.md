# Communities Feature - Testing Guide

## 🚀 Server is Running!

The application is now running at: **http://localhost:3001**

## 📋 Testing Checklist

### 1. User Registration & Login
- [ ] Navigate to `/login`
- [ ] Create a new account or login
- [ ] Verify you're redirected to home page

### 2. Browse Communities (`/communities`)
- [ ] Click "Communities" in navigation
- [ ] Verify you can see the communities list
- [ ] Test search functionality (type in search box)
- [ ] Test filter by type dropdown (GENERAL, BRAND, REGIONAL, INTEREST)
- [ ] Switch between "All Communities" and "Trending" tabs

### 3. Create a Community
- [ ] Click "Create Community" button (top right)
- [ ] Fill in the form:
  - **Name**: "Tesla Owners Club"
  - **Slug**: "tesla-owners-club"
  - **Type**: Select "BRAND"
  - **Description**: "A community for Tesla enthusiasts"
- [ ] Click "Create" button
- [ ] Verify success toast notification
- [ ] Verify new community appears in the list

### 4. Join a Community
- [ ] Find any community in the list
- [ ] Click "Join" button
- [ ] Verify button changes to "Joined" with checkmark
- [ ] Verify member count increases by 1

### 5. View Community Detail
- [ ] Click "View" button on any community
- [ ] Verify you're on `/communities/:slug` page
- [ ] Check community information is displayed
- [ ] Verify "Posts" and "About" tabs

### 6. Create a Post in Community
**Note: You must be a member to post**
- [ ] Join the community if not already a member
- [ ] Navigate to community detail page
- [ ] Find the Post Composer at the top
- [ ] Type a message: "Just got my new EV! 🚗⚡"
- [ ] (Optional) Click image icon to upload a photo
- [ ] (Optional) Click emoji icon to add emojis
- [ ] Click "Post" button
- [ ] Verify post appears in the feed below
- [ ] Verify success toast notification

### 7. Like a Post
- [ ] Find any post in the feed
- [ ] Click the ❤️ (heart) icon
- [ ] Verify heart fills with color (red)
- [ ] Verify like count increases by 1
- [ ] Click heart again to unlike
- [ ] Verify heart becomes outlined
- [ ] Verify like count decreases by 1

### 8. Comment on a Post
**Method 1: From Feed**
- [ ] Click the 💬 (comment) icon on any post
- [ ] Verify you're redirected to post detail page

**Method 2: From Post Detail**
- [ ] Click on any post card to open detail view
- [ ] Scroll to comment input area
- [ ] Type a comment: "Great post! 👍"
- [ ] Click "Reply" button
- [ ] Verify comment appears below the post
- [ ] Verify comment count increases

### 9. View All Comments
- [ ] Open any post detail page
- [ ] Scroll down to see all comments
- [ ] Verify each comment shows:
  - Author name and avatar
  - Comment text
  - Timestamp
  - Delete button (if you're the author)

### 10. Delete a Comment
- [ ] Find a comment you created
- [ ] Click the 🗑️ (trash) icon
- [ ] Verify comment is removed
- [ ] Verify comment count decreases

### 11. Edit a Post
- [ ] Find a post you created
- [ ] Click the ⋮ (three dots) menu
- [ ] Click "Edit"
- [ ] Modify the text
- [ ] Click "Save Changes"
- [ ] Verify post text is updated

### 12. Delete a Post
- [ ] Find a post you created
- [ ] Click the ⋮ (three dots) menu
- [ ] Click "Delete"
- [ ] Confirm deletion in dialog
- [ ] Verify post is removed from feed

### 13. Bookmark a Post
- [ ] Find any post
- [ ] Click the 🔖 (bookmark) icon
- [ ] Verify success toast notification
- [ ] Verify bookmark icon fills with color

### 14. Report a Post
- [ ] Find a post created by another user
- [ ] Click the ⋮ (three dots) menu
- [ ] Click "Report"
- [ ] Enter a reason: "Inappropriate content"
- [ ] Click "Submit Report"
- [ ] Verify success toast notification

### 15. Leave a Community
- [ ] Go to community detail page
- [ ] Click "Joined" button
- [ ] Verify button changes back to "Join Community"
- [ ] Verify member count decreases by 1
- [ ] Verify Post Composer disappears (non-members can't post)

### 16. Test Responsive Design
- [ ] Resize browser window to mobile size
- [ ] Verify layout adapts properly
- [ ] Test all features on mobile view

## 🎯 Expected Behavior

### Permissions
- ✅ **Any authenticated user** can create communities
- ✅ **Only members** can post in communities
- ✅ **Anyone** can view posts
- ✅ **Only authenticated users** can like/comment
- ✅ **Authors** can edit/delete their own posts
- ✅ **Authors** can delete their own comments
- ✅ **Admins/Moderators** can delete any post/comment

### UI Feedback
- ✅ Toast notifications for all actions
- ✅ Loading states during API calls
- ✅ Optimistic UI updates (immediate feedback)
- ✅ Error messages for failed operations
- ✅ Disabled buttons during processing

### Data Persistence
- ✅ All data is saved to MongoDB
- ✅ Refresh page - data persists
- ✅ Logout and login - data persists
- ✅ Member counts update correctly
- ✅ Like/comment counts update correctly

## 🐛 Common Issues & Solutions

### Issue: "Please log in" error
**Solution**: Make sure you're logged in. Navigate to `/login` and create an account.

### Issue: Can't create post in community
**Solution**: You must join the community first. Click "Join Community" button.

### Issue: "Failed to create community" error
**Solution**: Make sure the slug is unique and doesn't contain spaces. Use hyphens instead.

### Issue: Images not uploading
**Solution**: 
- Check image size (max 5MB)
- Only 4 images allowed per post
- Supported formats: JPG, PNG, GIF, WebP

### Issue: Comments not appearing
**Solution**: Refresh the page. The comment system uses React Query which should auto-refresh.

## 📊 Test Data Suggestions

### Community Names
- "Tesla Owners Club"
- "EV Charging Tips"
- "California EV Drivers"
- "Long Range Road Trips"
- "Nissan Leaf Community"

### Post Ideas
- "Just got my new EV! Any tips for a first-time owner?"
- "Found an amazing charging station in downtown! ⚡"
- "Road trip from LA to SF - 300 miles on a single charge! 🚗"
- "Anyone else experiencing range anxiety? How do you deal with it?"
- "Best EV accessories you've bought?"

### Comment Ideas
- "Congratulations! Welcome to the EV family! 🎉"
- "Great post! I had the same experience."
- "Thanks for sharing! This is really helpful."
- "Where is this charging station located?"
- "I recommend getting a home charger installed."

## ✅ Success Criteria

All features are working if:
- ✅ You can create and join communities
- ✅ You can post in communities you've joined
- ✅ You can like posts and see the count update
- ✅ You can add comments and see them appear
- ✅ You can delete your own posts and comments
- ✅ All actions show appropriate feedback (toasts)
- ✅ Data persists after page refresh

## 🎉 Enjoy Testing!

The Communities feature is fully functional. Have fun exploring and testing all the features!

If you encounter any issues, check the browser console (F12) for error messages.
