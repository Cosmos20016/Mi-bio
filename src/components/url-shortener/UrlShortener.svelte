<script>
  import { onMount } from 'svelte';

  let links = [];
  let newUrl = '';
  let newName = '';
  let isLoading = false;
  let error = '';
  let editingId = null;
  let editName = '';
  let searchTerm = '';
  let sortBy = 'date';
  let filterTag = '';
  let availableTags = [];
  let currentTab = 'links';
  let stats = {
    total: 0,
    today: 0,
    thisWeek: 0,
    byDomain: {}
  };

  // Iconos embebidos como data URIs para evitar problemas de CSP
  const embeddedIcons = {
    'youtube': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF0000"%3E%3Cpath d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/%3E%3C/svg%3E',
    'facebook': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231877F2"%3E%3Cpath d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/%3E%3C/svg%3E',
    'twitter': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231DA1F2"%3E%3Cpath d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/%3E%3C/svg%3E',
    'instagram': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(%23ig)"%3E%3Cdefs%3E%3CradialGradient id="ig"%3E%3Cstop offset="0%25" stop-color="%23f09433"/%3E%3Cstop offset="25%25" stop-color="%23e6683c"/%3E%3Cstop offset="50%25" stop-color="%23dc2743"/%3E%3Cstop offset="75%25" stop-color="%23cc2366"/%3E%3Cstop offset="100%25" stop-color="%23bc1888"/%3E%3C/radialGradient%3E%3C/defs%3E%3Cpath d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/%3E%3C/svg%3E',
    'github': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23181717"%3E%3Cpath d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/%3E%3C/svg%3E',
    'linkedin': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230A66C2"%3E%3Cpath d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/%3E%3C/svg%3E',
    'reddit': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF4500"%3E%3Cpath d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/%3E%3C/svg%3E',
    'tiktok': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23000000"%3E%3Cpath d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/%3E%3C/svg%3E',
    'whatsapp': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2325D366"%3E%3Cpath d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/%3E%3C/svg%3E',
    'telegram': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2326A5E4"%3E%3Cpath d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/%3E%3C/svg%3E',
    'spotify': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231DB954"%3E%3Cpath d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/%3E%3C/svg%3E',
    'amazon': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF9900"%3E%3Cpath d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.548.41-3.16.615-4.84.615-3.086 0-5.97-.615-8.655-1.846-1.142-.524-2.144-1.098-3.005-1.72-.11-.078-.174-.17-.197-.28-.036-.14.014-.256.12-.366zm13.53-6.94c0 .896-.03 1.64-.09 2.23-.06.59-.192 1.24-.4 1.946-.03.105-.1.16-.205.16-.106 0-.196-.05-.27-.16l-1.32-1.89c-1.44 1.67-3.1 2.506-4.98 2.506-1.32 0-2.37-.38-3.15-1.14-.78-.76-1.17-1.77-1.17-3.03 0-1.56.62-2.77 1.87-3.63 1.25-.86 3-.99 5.27-.99h2.01v-.83c0-.95-.18-1.64-.55-2.07-.37-.43-.98-.65-1.84-.65-.68 0-1.37.15-2.06.45-.69.3-1.29.65-1.79 1.06-.1.08-.21.11-.32.11-.08 0-.16-.03-.22-.08l-.85-.97c-.08-.1-.11-.2-.11-.31 0-.11.04-.2.13-.29.76-.69 1.68-1.24 2.76-1.65 1.08-.41 2.16-.62 3.23-.62 1.84 0 3.21.43 4.13 1.29.92.86 1.37 2.19 1.37 4v5.77zm-5.52 2.5c1.14 0 2.14-.36 3-1.08.86-.72 1.29-1.62 1.29-2.7v-1.33h-1.65c-1.33 0-2.32.24-2.97.73-.65.49-.98 1.18-.98 2.08 0 .7.2 1.26.6 1.68.4.42.93.63 1.59.63zm14.93 6.4c-.12.12-.26.18-.44.18-.1 0-.24-.04-.42-.11l-6.25-2.64c-.16-.07-.24-.17-.24-.3s.07-.23.22-.31l6.25-2.93c.18-.08.32-.12.44-.12.18 0 .32.06.44.18.12.12.18.26.18.42v5.23c0 .17-.06.3-.18.42zm-.44-5.45l-4.93 2.3 4.93 2.08v-4.38z"/%3E%3C/svg%3E',
    'netflix': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E50914"%3E%3Cpath d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/%3E%3C/svg%3E',
    'pinterest': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E60023"%3E%3Cpath d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/%3E%3C/svg%3E',
    'discord': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235865F2"%3E%3Cpath d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/%3E%3C/svg%3E',
    'google': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%234285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/%3E%3Cpath fill="%2334A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/%3E%3Cpath fill="%23FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/%3E%3Cpath fill="%23EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/%3E%3C/svg%3E',
    'microsoft': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23F25022" d="M0 0h11.377v11.372H0z"/%3E%3Cpath fill="%2380BB03" d="M12.623 0H24v11.372H12.623z"/%3E%3Cpath fill="%2302A4EF" d="M0 12.628h11.377V24H0z"/%3E%3Cpath fill="%23FFB903" d="M12.623 12.628H24V24H12.623z"/%3E%3C/svg%3E',
    'apple': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23000000"%3E%3Cpath d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/%3E%3C/svg%3E'
  };

  // Función mejorada para obtener icono basado en dominio
  function getIconForUrl(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '').toLowerCase();
      
      // Buscar coincidencia exacta en iconos embebidos
      for (const [key, iconData] of Object.entries(embeddedIcons)) {
        if (domain.includes(key)) {
          return iconData;
        }
      }
      
      // Fallback: usar Google favicon service (más confiable que el de cada sitio)
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
      return '🔗';
    }
  }

  function generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return 'url-invalida';
    }
  }

  async function addLink() {
    if (!newUrl.trim()) return;
    
    error = '';
    isLoading = true;

    try {
      const urlObj = new URL(newUrl);
      const shortCode = generateShortCode();
      const domain = extractDomain(newUrl);
      
      const link = {
        id: Date.now(),
        shortCode: shortCode,
        originalUrl: newUrl,
        customName: newName.trim() || `${domain}`,
        domain: domain,
        icon: getIconForUrl(newUrl),
        clicks: 0,
        createdAt: new Date().toISOString(),
        tags: []
      };

      links = [link, ...links];
      saveLinks();
      updateStats();
      
      newUrl = '';
      newName = '';
    } catch (e) {
      error = 'URL inválida. Por favor ingresa una URL completa (ej: https://ejemplo.com)';
    } finally {
      isLoading = false;
    }
  }

  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    saveLinks();
    updateStats();
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(`https://spoo.me/${text}`);
    alert('¡Enlace copiado!');
  }

  function startEdit(link) {
    editingId = link.id;
    editName = link.customName;
  }

  function saveEdit(id) {
    links = links.map(l => 
      l.id === id ? { ...l, customName: editName } : l
    );
    editingId = null;
    saveLinks();
  }

  function saveLinks() {
    localStorage.setItem('shortLinks', JSON.stringify(links));
  }

  function loadLinks() {
    const saved = localStorage.getItem('shortLinks');
    if (saved) {
      links = JSON.parse(saved);
      updateStats();
    }
  }

  function updateStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    stats.total = links.length;
    stats.today = links.filter(l => new Date(l.createdAt) >= today).length;
    stats.thisWeek = links.filter(l => new Date(l.createdAt) >= weekAgo).length;
    
    stats.byDomain = links.reduce((acc, link) => {
      acc[link.domain] = (acc[link.domain] || 0) + 1;
      return acc;
    }, {});
  }

  $: filteredLinks = links.filter(link => {
    const matchesSearch = link.customName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !filterTag || (link.tags && link.tags.includes(filterTag));
    return matchesSearch && matchesTag;
  }).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'name') return a.customName.localeCompare(b.customName);
    if (sortBy === 'clicks') return b.clicks - a.clicks;
    return 0;
  });

  $: topDomains = Object.entries(stats.byDomain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  onMount(() => {
    loadLinks();
  });
</script>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }

  .header {
    text-align: center;
    color: white;
    margin-bottom: 30px;
  }

  .header h1 {
    font-size: 2.5em;
    margin: 0 0 10px 0;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  }

  .header p {
    opacity: 0.9;
    font-size: 1.1em;
  }

  .tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    background: rgba(255,255,255,0.1);
    border-radius: 15px;
    padding: 5px;
    backdrop-filter: blur(10px);
  }

  .tab {
    flex: 1;
    padding: 12px;
    border: none;
    background: transparent;
    color: white;
    font-size: 1em;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.3s;
  }

  .tab.active {
    background: white;
    color: #667eea;
    font-weight: 600;
  }

  .card {
    background: white;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    margin-bottom: 20px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .input-group {
    display: flex;
    gap: 10px;
  }

  input {
    flex: 1;
    padding: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 1em;
    transition: border 0.3s;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
  }

  button {
    padding: 15px 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }

  button:hover {
    transform: translateY(-2px);
  }

  button:active {
    transform: translateY(0);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    color: #f44336;
    font-size: 0.9em;
    margin-top: -10px;
  }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  select {
    padding: 10px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 0.9em;
    cursor: pointer;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 15px;
    transition: all 0.3s;
  }

  .link-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
  }

  .link-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    object-fit: cover;
    background: white;
    padding: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .link-info {
    flex: 1;
    min-width: 0;
  }

  .link-name {
    font-weight: 600;
    font-size: 1.1em;
    color: #333;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .link-url {
    color: #666;
    font-size: 0.9em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-short {
    color: #667eea;
    font-weight: 600;
    font-size: 0.95em;
  }

  .link-meta {
    display: flex;
    gap: 15px;
    font-size: 0.85em;
    color: #999;
    margin-top: 5px;
  }

  .link-actions {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2em;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 15px;
    text-align: center;
  }

  .stat-value {
    font-size: 2.5em;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .stat-label {
    opacity: 0.9;
    font-size: 0.9em;
  }

  .domain-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .domain-item {
    display: flex;
    justify-content: space-between;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 10px;
    margin-bottom: 10px;
  }

  .domain-name {
    font-weight: 600;
    color: #333;
  }

  .domain-count {
    background: #667eea;
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    font-weight: 600;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #999;
  }

  .empty-state-icon {
    font-size: 4em;
    margin-bottom: 20px;
  }

  @media (max-width: 768px) {
    .input-group {
      flex-direction: column;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .link-item {
      flex-direction: column;
      text-align: center;
    }
    
    .link-actions {
      width: 100%;
      justify-content: center;
    }
  }
</style>

<div class="container">
  <div class="header">
    <h1>🔗 Gestor de Enlaces</h1>
    <p>Acorta y organiza tus URLs favoritas</p>
  </div>

  <div class="tabs">
    <button class="tab" class:active={currentTab === 'links'} on:click={() => currentTab = 'links'}>
      📋 Enlaces
    </button>
    <button class="tab" class:active={currentTab === 'stats'} on:click={() => currentTab = 'stats'}>
      📊 Estadísticas
    </button>
  </div>

  {#if currentTab === 'links'}
    <div class="card">
      <form class="form" on:submit|preventDefault={addLink}>
        <input
          type="url"
          bind:value={newUrl}
          placeholder="Pega aquí tu URL (ej: https://youtube.com/watch?v=...)"
          required
        />
        <div class="input-group">
          <input
            type="text"
            bind:value={newName}
            placeholder="Nombre personalizado (opcional)"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? '⏳ Creando...' : '✨ Acortar URL'}
          </button>
        </div>
      </form>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

    {#if links.length > 0}
      <div class="card">
        <div class="controls">
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="🔍 Buscar enlaces..."
            style="flex: 1; min-width: 200px;"
          />
          <select bind:value={sortBy}>
            <option value="date">📅 Más recientes</option>
            <option value="name">🔤 Alfabético</option>
            <option value="clicks">👆 Más clicks</option>
          </select>
        </div>

        <div class="links-list">
          {#each filteredLinks as link (link.id)}
            <div class="link-item">
              <img 
                src={link.icon} 
                alt={link.domain}
                class="link-icon"
                on:error={(e) => e.target.src = '🔗'}
              />
              <div class="link-info">
                {#if editingId === link.id}
                  <input
                    type="text"
                    bind:value={editName}
                    on:blur={() => saveEdit(link.id)}
                    on:keypress={(e) => e.key === 'Enter' && saveEdit(link.id)}
                    style="width: 100%;"
                  />
                {:else}
                  <div class="link-name">
                    {link.customName}
                  </div>
                {/if}
                <div class="link-url">{link.originalUrl}</div>
                <div class="link-meta">
                  <span class="link-short">spoo.me/{link.shortCode}</span>
                  <span>👆 {link.clicks} clicks</span>
                  <span>📅 {new Date(link.createdAt).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
              <div class="link-actions">
                <button class="icon-btn" on:click={() => copyToClipboard(link.shortCode)} title="Copiar">
                  📋
                </button>
                <button class="icon-btn" on:click={() => startEdit(link)} title="Editar">
                  ✏️
                </button>
                <button class="icon-btn" on:click={() => window.open(link.originalUrl, '_blank')} title="Abrir">
                  🔗
                </button>
                <button class="icon-btn" on:click={() => deleteLink(link.id)} title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="card empty-state">
        <div class="empty-state-icon">🔗</div>
        <h2>No tienes enlaces guardados</h2>
        <p>Comienza pegando una URL arriba para crear tu primer enlace corto</p>
      </div>
    {/if}
  {/if}

  {#if currentTab === 'stats'}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{stats.total}</div>
        <div class="stat-label">Enlaces totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{stats.today}</div>
        <div class="stat-label">Creados hoy</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{stats.thisWeek}</div>
        <div class="stat-label">Esta semana</div>
      </div>
    </div>

    <div class="card">
      <h2>🌐 Dominios más usados</h2>
      {#if topDomains.length > 0}
        <ul class="domain-list">
          {#each topDomains as [domain, count]}
            <li class="domain-item">
              <span class="domain-name">{domain}</span>
              <span class="domain-count">{count}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p style="text-align: center; color: #999;">No hay datos aún</p>
      {/if}
    </div>
  {/if}
</div>
