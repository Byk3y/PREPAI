# Profile Button Redesign Plan

## Current State
- **Location**: Top right corner of `HomeHeader.tsx`
- **Current Design**: Blue circular button (`#3B82F6`) with person emoji (👤)
- **Issue**: Blue color doesn't match the app's sophisticated, minimal aesthetic

## Design Options

### Option 1: Minimal Glassmorphism (Recommended ⭐)
**Style**: Subtle glass effect matching the action buttons
- **Light Mode**: White background with subtle border, soft shadow
- **Dark Mode**: BlurView with glass effect (matching HomeActionButtons)
- **Icon**: MaterialIcons `account-circle` or `person`
- **Size**: 40x40 (current)
- **Why**: Matches existing action buttons, sophisticated, theme-aware

### Option 2: Gradient Avatar Circle
**Style**: Gradient background with user initials or avatar
- **Light Mode**: Soft gradient (e.g., purple to pink, blue to teal)
- **Dark Mode**: Darker gradient with higher contrast
- **Content**: User's first initial if no avatar, or actual avatar image
- **Fallback**: MaterialIcons icon if no name/avatar
- **Why**: Personal, modern, adds visual interest without being loud

### Option 3: Minimal Outline Style
**Style**: Clean outline with subtle fill
- **Light Mode**: Thin border (`#e5e4df`), transparent/light fill
- **Dark Mode**: Border with subtle glow, semi-transparent fill
- **Icon**: MaterialIcons `settings` or `more-vert` (3 dots)
- **Why**: Ultra-minimal, matches NotebookLM aesthetic perfectly

### Option 4: Badge with Streak Indicator
**Style**: Profile icon with streak badge overlay
- **Base**: Minimal style (Option 1 or 3)
- **Badge**: Small circular badge showing streak count (top-right corner)
- **Color**: Accent yellow (`#FFCB3C`) for streak badge
- **Why**: Functional, shows user progress, adds gamification element

### Option 5: Animated Gradient Ring
**Style**: Animated gradient ring that pulses subtly
- **Base**: Minimal circle with animated gradient border
- **Animation**: Subtle pulse/breathing effect
- **Colors**: Theme-aware gradient (primary colors)
- **Why**: Eye-catching but subtle, modern, premium feel

## Recommendation

**Primary Choice**: **Option 1 (Glassmorphism)** - Best balance of sophistication and consistency
**Secondary Choice**: **Option 2 (Gradient Avatar)** - If you want more personality

## Implementation Details

### Option 1 Implementation:
```typescript
// Light mode: White with border
backgroundColor: colors.surfaceElevated
borderWidth: 1
borderColor: colors.border
shadowColor: colors.shadowColor
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 8

// Dark mode: BlurView
<BlurView intensity={40} tint="light">
  backgroundColor: 'rgba(255, 255, 255, 0.15)'
</BlurView>
```

### Option 2 Implementation:
```typescript
// Generate gradient from user's name/ID
const gradientColors = generateGradientFromString(user.name || user.id)

// Show initials or avatar
{user.avatar ? (
  <Image source={{ uri: user.avatar }} />
) : user.first_name ? (
  <Text>{user.first_name[0].toUpperCase()}</Text>
) : (
  <MaterialIcons name="person" />
)}
```

## Next Steps
1. Choose preferred option(s)
2. Implement the design
3. Test in both light and dark modes
4. Ensure accessibility (touch target size, contrast)

