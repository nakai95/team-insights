# Feature Specification: GitHub OAuth Authentication

**Feature Branch**: `002-github-oauth`
**Created**: 2025-12-20
**Status**: Draft
**Input**: User description: "GitHub OAuth認証機能を実装し、既存のToken直接入力方式を廃止する。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - First-Time User Authentication (Priority: P1)

A new user visits the application for the first time and needs to authenticate with GitHub to analyze their repositories. They click the "Sign in with GitHub" button, are redirected to GitHub's authorization page, approve the requested permissions, and are returned to the application ready to use it.

**Why this priority**: This is the core authentication flow that enables all other features. Without this, users cannot access the application at all.

**Independent Test**: Can be fully tested by visiting the application as an unauthenticated user, clicking the sign-in button, and verifying successful authentication and session creation. Delivers immediate value by granting access to the application.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user visits the application, **When** they click "Sign in with GitHub", **Then** they are redirected to GitHub's OAuth authorization page
2. **Given** a user is on GitHub's authorization page, **When** they approve the requested permissions (read:user, repo), **Then** they are redirected back to the application with a valid session
3. **Given** a user has just authenticated, **When** they return to the application homepage, **Then** they see their GitHub username and profile picture in the header
4. **Given** an authenticated user, **When** they refresh the page, **Then** their session persists and they remain logged in

---

### User Story 2 - Repository Analysis Without Token Input (Priority: P1)

An authenticated user wants to analyze a repository. They simply paste the repository URL into the input field and click analyze, without needing to provide a personal access token.

**Why this priority**: This is the primary use case that differentiates OAuth from the old token-based approach. It directly improves user experience by removing manual token management.

**Independent Test**: Can be fully tested by authenticating a user, entering a repository URL, and verifying that analysis proceeds without requiring additional credentials. Delivers immediate value by simplifying the analysis workflow.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the analysis page, **When** they enter a valid repository URL, **Then** they can initiate analysis without providing a token
2. **Given** an authenticated user initiates analysis, **When** the system accesses the repository, **Then** it uses the OAuth access token from their session
3. **Given** an authenticated user analyzes a public repository, **When** analysis completes, **Then** results are displayed successfully
4. **Given** an authenticated user analyzes a private repository they have access to, **When** analysis completes, **Then** results are displayed successfully

---

### User Story 3 - Session Management and Logout (Priority: P2)

An authenticated user wants to log out of the application to protect their account or switch to a different GitHub account. They click the logout button in the header and are immediately signed out.

**Why this priority**: Essential for security and multi-account scenarios, but less critical than core authentication and analysis flows.

**Independent Test**: Can be fully tested by authenticating, clicking logout, and verifying session termination. Delivers value by giving users control over their authentication state.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click the "Sign out" button in the header, **Then** their session is terminated and they are redirected to the unauthenticated homepage
2. **Given** a user has signed out, **When** they try to access analysis features, **Then** they are prompted to sign in again
3. **Given** an authenticated user, **When** they close and reopen their browser, **Then** they remain authenticated (persistent session)

---

### User Story 4 - Token Expiration Handling (Priority: P2)

An authenticated user's OAuth access token expires after extended use or GitHub revokes it. When they attempt to analyze a repository, the system detects the invalid token and prompts them to re-authenticate.

**Why this priority**: Important for maintaining security and handling real-world token lifecycle scenarios, but occurs less frequently than normal usage.

**Independent Test**: Can be simulated by invalidating a user's token and attempting analysis. Delivers value by gracefully handling authentication errors without data loss.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an expired token, **When** they attempt to analyze a repository, **Then** they receive a clear error message explaining that re-authentication is required
2. **Given** a user receives a token expiration error, **When** they click the "Re-authenticate" button, **Then** they are redirected through the OAuth flow again
3. **Given** a user re-authenticates after token expiration, **When** authentication succeeds, **Then** they can resume their previous activity without data loss

---

### User Story 5 - Insufficient Permissions Handling (Priority: P3)

A user attempts to analyze a private repository they do not have access to. The system detects insufficient permissions and displays a helpful error message explaining the issue.

**Why this priority**: Handles edge cases for repository access, less common than successful analysis scenarios.

**Independent Test**: Can be tested by authenticating and attempting to analyze an inaccessible repository. Delivers value by providing clear feedback on access issues.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they attempt to analyze a private repository they don't have access to, **Then** they receive an error message stating "You do not have permission to access this repository"
2. **Given** a permission error occurs, **When** the user sees the error message, **Then** it includes guidance on how to request access or verify repository visibility
3. **Given** an authenticated user, **When** GitHub revokes repository access during analysis, **Then** the system handles the error gracefully without crashing

---

### Edge Cases

- What happens when GitHub's OAuth service is unavailable during authentication?
- How does the system handle users who deny permission requests on GitHub's authorization page?
- What happens when a user's GitHub account is suspended or deleted after authentication?
- How does the system handle concurrent sessions from the same user on different devices?
- What happens when the OAuth callback receives malformed or tampered data?
- How does the system handle token refresh failures for long-running analysis operations?
- What happens when repository URLs contain special characters or are malformed?
- How does the system prevent token leakage in error messages, logs, or browser console?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Sign in with GitHub" button on the homepage for unauthenticated users
- **FR-002**: System MUST redirect users to GitHub's OAuth authorization page with requested scopes (read:user, repo)
- **FR-003**: System MUST handle OAuth callback from GitHub and exchange authorization code for access token
- **FR-004**: System MUST store OAuth access token securely in encrypted JWT
- **FR-005**: System MUST retrieve OAuth access token from encrypted JWT when performing repository operations
- **FR-006**: System MUST display authenticated user's GitHub username and profile picture in application header
- **FR-007**: System MUST provide a "Sign out" button that terminates the user's session
- **FR-008**: System MUST remove the existing personal access token input field from the analysis form
- **FR-009**: System MUST use OAuth token for all GitHub API operations (Octokit)
- **FR-010**: System MUST format OAuth token as `https://oauth2:<token>@github.com/owner/repo.git` for git clone operations
- **FR-011**: System MUST prevent OAuth tokens from appearing in error messages, logs, or client-side code
- **FR-012**: System MUST detect expired or invalid OAuth tokens during repository operations
- **FR-013**: System MUST display user-friendly error messages when authentication fails
- **FR-014**: System MUST prompt users to re-authenticate when token expiration is detected
- **FR-015**: System MUST restrict access to analysis features for unauthenticated users
- **FR-016**: System MUST handle OAuth callback errors (user denial, authorization failure) gracefully
- **FR-017**: System MUST maintain persistent sessions across browser restarts for up to 7 days, with automatic extension on user activity
- **FR-018**: System MUST automatically expire sessions after 7 days of inactivity
- **FR-019**: System MUST clean up OAuth tokens when user signs out
- **FR-020**: System MUST prompt users to re-authenticate when OAuth token expires, without implementing automatic token refresh in initial release
- **FR-021**: Authentication logic MUST be implemented in infrastructure layer, with session access abstracted through application layer interfaces

### Key Entities

- **User Session**: Represents an authenticated user's session, containing OAuth access token, GitHub user ID, username, profile picture URL, and session creation/expiration timestamps
- **OAuth Configuration**: GitHub OAuth application credentials stored in environment variables
  (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete authentication flow (from clicking "Sign in" to being authenticated) in under 30 seconds
- **SC-002**: 95% of users successfully authenticate on their first attempt
- **SC-003**: Zero OAuth tokens appear in application logs, error messages, or client-side code
- **SC-004**: Users can analyze repositories without manually creating or entering GitHub tokens, reducing authentication steps by 100%
- **SC-005**: Session persistence allows users to close and reopen their browser without re-authenticating for up to 7 days, with automatic session extension on each user activity
- **SC-006**: Token expiration errors are detected and communicated to users within 5 seconds of occurrence
- **SC-007**: All authentication error scenarios display clear, actionable error messages without exposing sensitive information
