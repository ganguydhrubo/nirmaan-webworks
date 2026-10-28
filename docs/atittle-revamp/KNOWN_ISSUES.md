# ATITTLE.COM — Known Issues & Resolution Log

## 1. Active Issues Under Remediation

| Issue ID | Severity | Area | Description | Status | Evidence / Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-001** | Medium | Tests | `tests/unit/builder.test.ts` fails on template count assertion (`expected 10, got 12`). | **Identified** | Update test to dynamic validation across all catalog templates (`expect(TEMPLATE_LIST.length).toBeGreaterThanOrEqual(10)`). |
| **ISSUE-002** | High | Visual Editor | Canvas element selection and inline editing can become unresponsive or misaligned when viewport scale is applied. | **In Progress** | Fix coordinate mapping, add explicit section action controls (move up, move down, duplicate, delete), and ensure pointer events are not swallowed. |
| **ISSUE-003** | High | Editor UX | Drag-and-drop section reordering is missing visual drop indicator lines. | **In Progress** | Implement drag-and-drop handles in both LeftPanel and Canvas with clear visual indicator. |
| **ISSUE-004** | Medium | Marketplace | Template catalog is embedded inside onboarding modals rather than having a full dedicated marketplace page with category filtering and deep live previews. | **In Progress** | Build dedicated Template Marketplace at `/templates` and integrate into `/free-website-builder`. |
| **ISSUE-005** | Medium | Properties Panel | Granular styling controls (typography sizing, padding, corner radius, borders, background colors) need unified visual controls. | **In Progress** | Upgrade `Properties.tsx` with dedicated style tabs and accessible sliders/color pickers. |
