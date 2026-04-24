# Requirements Document

## Introduction

Users waiting for a merchant to complete a cash trade have no visible indication of how much time remains before the trade expires. When a trade does expire, there is no dedicated screen explaining what happened or what the user can expect next (refund timeline, support options). This causes financial anxiety and confusion.

This feature adds a live countdown timer to the QR Reveal screen and a new `TradeExpired` screen that is shown automatically when the trade timeout is reached. The backend refund logic already exists; this feature only covers the frontend experience.

## Glossary

- **Trade**: A peer-to-peer cash exchange initiated by the user, tracked by a unique `id` and an `expires_at` timestamp returned by the API.
- **QRReveal**: The existing page (`QRReveal.tsx`) where the user shows their QR code to the merchant while waiting for the cash handoff.
- **Countdown_Timer**: The UI component that displays the remaining time until a trade expires, rendered inside QRReveal.
- **Warning_Banner**: An inline visual element (not a modal or popup) that appears on QRReveal when the remaining time drops to or below two minutes.
- **TradeExpired**: The new page (`TradeExpired.tsx`) shown when a trade's countdown reaches zero or the trade status becomes `expired`.
- **Refund_ETA**: The estimated time for the automatic refund to be credited back to the user's wallet, expressed in minutes.
- **Support_Link**: A navigable link or button that opens the support contact channel (e.g., a Telegram support bot URL or mailto).
- **Router**: The navigation mechanism in the MicoPay mobile web app, currently implemented as prop-based page switching in `App.tsx` / `DemoTerminal.tsx`.

---

## Requirements

### Requirement 1: Live Countdown Timer on QR Reveal Screen

**User Story:** As a user waiting for a merchant, I want to see a live countdown showing how much time I have left, so that I know exactly when my trade will expire and can plan accordingly.

#### Acceptance Criteria

1. WHEN the QRReveal screen is mounted and `activeTrade.expires_at` is available, THE Countdown_Timer SHALL display the remaining time in `MM:SS` format, updated every second.
2. WHILE the remaining time is greater than zero, THE Countdown_Timer SHALL decrement by one second on each tick without resetting or skipping values.
3. IF `activeTrade.expires_at` is not provided or is in the past at mount time, THEN THE Countdown_Timer SHALL display `00:00` and treat the trade as already expired.
4. THE Countdown_Timer SHALL be visible on the QRReveal screen without requiring the user to scroll.
5. WHEN the countdown reaches `00:00`, THE QRReveal screen SHALL automatically navigate to the TradeExpired screen without requiring user interaction.

### Requirement 2: Two-Minute Warning Banner

**User Story:** As a user waiting for a merchant, I want a clear visual warning when only two minutes remain, so that I can take action (contact the merchant, leave) before the trade expires.

#### Acceptance Criteria

1. WHEN the remaining time drops to or below 120 seconds, THE Warning_Banner SHALL become visible on the QRReveal screen.
2. THE Warning_Banner SHALL use a distinct color (amber/warning tone, not the primary green) to differentiate it from normal status banners.
3. THE Warning_Banner SHALL display a human-readable message indicating urgency, such as "Quedan menos de 2 minutos" or equivalent.
4. THE Warning_Banner SHALL be an inline element within the page layout and SHALL NOT render as a modal, dialog, or popup overlay.
5. WHILE the remaining time is above 120 seconds, THE Warning_Banner SHALL remain hidden so as not to cause premature anxiety.

### Requirement 3: Automatic Navigation to TradeExpired Screen

**User Story:** As a user whose trade has expired, I want to be taken to a clear explanation screen automatically, so that I am never left on a broken or stale QR screen.

#### Acceptance Criteria

1. WHEN the Countdown_Timer reaches `00:00`, THE QRReveal screen SHALL navigate to the TradeExpired screen within one second.
2. WHEN the TradeExpired screen is mounted, THE TradeExpired screen SHALL display the trade amount and the merchant name that was involved in the expired trade.
3. THE TradeExpired screen SHALL display the Refund_ETA expressed in minutes (e.g., "Tu reembolso llegará en aproximadamente 30 minutos").
4. THE TradeExpired screen SHALL display the Support_Link so the user can contact support if the refund does not arrive.
5. THE TradeExpired screen SHALL provide a navigation action that returns the user to the Home screen.
6. IF the user navigates back from the TradeExpired screen, THEN THE Router SHALL route the user to the Home screen, not back to QRReveal.

### Requirement 4: No Dead-End Navigation

**User Story:** As a user on the TradeExpired screen, I want clear paths to either go home or contact support, so that I am never stranded with no way forward.

#### Acceptance Criteria

1. THE TradeExpired screen SHALL display a primary action button labeled to return to the Home screen (e.g., "Volver al inicio").
2. THE TradeExpired screen SHALL display a secondary action that opens the Support_Link (e.g., "Contactar soporte").
3. WHEN the user activates the Support_Link, THE TradeExpired screen SHALL open the support channel in a new browser tab or the device's default messaging app, without navigating away from the current screen first.
4. THE TradeExpired screen SHALL NOT display the QR code or any action that implies the trade can still be completed.

### Requirement 5: Router Registration for TradeExpired Screen

**User Story:** As a developer integrating this feature, I want the TradeExpired screen registered in the app's routing/navigation layer, so that it can be reached from QRReveal and exited cleanly to Home.

#### Acceptance Criteria

1. THE Router SHALL include a navigation path that renders the TradeExpired screen when triggered by the expiry event from QRReveal.
2. THE Router SHALL include a navigation path from TradeExpired back to the Home screen.
3. WHEN the TradeExpired screen is active, THE Router SHALL prevent the back-navigation gesture from returning to QRReveal.

### Requirement 6: Testability — Mock Expiry Scenario

**User Story:** As a developer testing this feature, I want to be able to mock a trade with a short `expires_at` value, so that I can verify the full countdown-to-expiry transition without waiting 30 minutes.

#### Acceptance Criteria

1. THE Countdown_Timer SHALL derive remaining time solely from `activeTrade.expires_at` and the current wall-clock time, with no hardcoded duration, so that passing a near-future `expires_at` (e.g., 5 seconds from now) produces a 5-second countdown in tests.
2. WHEN `expires_at` is set to a timestamp 5 seconds in the future, THE QRReveal screen SHALL transition to the TradeExpired screen within 6 seconds of mount.
3. THE TradeData interface SHALL include an optional `expires_at` field (ISO 8601 string) so that mock trade objects can supply it without modifying the API service contract.
