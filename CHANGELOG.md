# Changelog

## 2.2.0

### Added
- Complete SEO foundation (robots.txt, sitemap.xml, dynamic canonical tags, JSON-LD)
- P2P message ID generation for accurate state synchronization
- Synchronized whisper mode expiry across all participants
- Content-rich SEO landing page and dedicated informational routes
- AdSense preparation (ads.txt, AdBanner component, chat-route exclusion)
- In-memory rate limiting for server-side AI requests to prevent abuse
- Connection Diagnostics view for troubleshooting WebRTC

### Changed
- Migrated Tailwind CSS to a compiled build process (removed CDN)
- Removed esm.sh import maps in favor of Vite bundler
- Refactored Gemini API calls to run exclusively server-side via Express
- Updated marketing copy to reflect accurate WebRTC transport security claims

### Fixed
- Reactions and replies failing to synchronize properly across P2P connections
- SPA deep-linking and static asset serving in the production Express server
