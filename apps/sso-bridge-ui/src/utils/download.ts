/**
 * Utility functions for downloading files
 */

/**
 * Download recovery codes as a text file
 * @param recoveryCodes - Array of recovery codes to download
 */
export const downloadRecoveryCodes = (recoveryCodes: string[]): void => {
  if (!recoveryCodes.length) return;

  const content = `SSO Bridge Recovery Codes
Generated: ${new Date().toLocaleString()}

Save these codes in a safe place. Each code can only be used once.
If you lose access to your two-factor authentication method, you can use these codes to regain access to your account.

Recovery Codes:
${recoveryCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

Keep these codes secure and do not share them with anyone.
`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sso-bridge-recovery-codes.txt";
  a.click();
  window.URL.revokeObjectURL(url);
};
