# Registration Terms and Consent Fix — V335

- The existing Terms & Conditions link uses the canonical `toggleModal` action targeting `tos-modal`.
- The TOS modal is already registered with the modal bootstrap; no duplicate modal or replacement policy text was introduced.
- The registration submit button starts disabled in markup.
- `syncRegistrationSubmitState()` controls the button from the current auth mode and checkbox state.
- Register is enabled only when `#agree-tos-checkbox` is checked; unchecking immediately disables it again.
- Login and password-reset modes do not require registration consent.
- The submit handler also validates consent before creating an account, so the UI state is not the only protection.

Manual testing is still required on the installed APK for touch behavior and keyboard/form submission.
