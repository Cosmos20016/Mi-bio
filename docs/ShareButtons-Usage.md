# ShareButtons Component Usage

## Overview
The `ShareButtons.svelte` component provides social media sharing functionality for blog posts. It creates share buttons for Twitter, Facebook, LinkedIn, and WhatsApp with a clean, responsive design.

## Location
`src/components/ShareButtons.svelte`

## Props
- `title` (string, required): The title of the post to be shared
- `url` (string, required): The full URL of the post to be shared

## Features
- **Four Social Platforms**: Twitter/X, Facebook, LinkedIn, WhatsApp
- **Responsive Design**: Shows text labels on desktop (sm and up), icons only on mobile
- **Accessible**: Proper ARIA labels and focus states
- **Clean UI**: Matches the existing blog design system
- **Popup Windows**: Opens sharing in optimally sized popup windows
- **URL Encoding**: Properly encodes titles and URLs for sharing

## Usage in Astro Pages

### Basic Usage
```astro
---
import ShareButtons from "@components/ShareButtons.svelte";

// Get the current post URL
const currentUrl = new URL(Astro.url.pathname, Astro.site).href;
const postTitle = "Your Post Title";
---

<ShareButtons 
    title={postTitle} 
    url={currentUrl}
    client:load
/>
```

### Integration in Post Templates
The component is already integrated in `/src/pages/posts/[...slug].astro`. To use it in other templates:

```astro
---
import ShareButtons from "@components/ShareButtons.svelte";

const currentUrl = new URL(Astro.url.pathname, Astro.site).href;
---

<!-- After your content -->
<div class="mb-6 onload-animation">
    <ShareButtons 
        title={entry.data.title} 
        url={currentUrl}
        client:load
    />
</div>
```

## Customization

### Styling
The component uses Tailwind CSS classes and follows the existing design system:
- Uses theme colors and variables
- Responsive breakpoints (sm: 640px)
- Hover and active states with scale animations
- Dark mode support

### Adding New Platforms
To add a new social platform, edit the `shareButtons` array in `ShareButtons.svelte`:

```typescript
{
    name: "Platform Name",
    icon: "iconify-icon-name",
    url: shareUrls.platform,
    color: "hover:text-[#BRANDCOLOR]",
    bgColor: "hover:bg-[#BRANDCOLOR]/10"
}
```

### URL Generation
Each platform has specific URL patterns:
- **Twitter**: `https://twitter.com/intent/tweet?text=${title}&url=${url}`
- **Facebook**: `https://www.facebook.com/sharer/sharer.php?u=${url}`
- **LinkedIn**: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
- **WhatsApp**: `https://wa.me/?text=${title} ${url}`

## Internationalization
The component uses the i18n system. The "Compartir" (Share) label comes from:
- Key: `I18nKey.share`
- Spanish: "Compartir"
- English: "Share"

To add translations for other languages, add the key to the respective language files in `src/i18n/languages/`.

## Browser Compatibility
- Modern browsers with popup support
- Graceful degradation for browsers without popup support
- Mobile responsive design

## Dependencies
- `@iconify/svelte` - For social media icons
- Tailwind CSS - For styling
- Astro i18n system - For translations

## Example Integration
See the working implementation in the blog post pages where the component appears after the content and before the license section.