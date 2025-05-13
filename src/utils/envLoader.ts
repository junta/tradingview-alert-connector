import 'dotenv/config';

export type ProfileName = "" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8" | "P9" | "P10";

// Helper function that calls process.env() on the variable for the
// specific PROFILE supplied in the JSON message body from TradingView.

// "P1" is treated as a special case to avoid issues with existing user setups,
// which presumably have NOT yet integrated the variable name change.
export function getEnvVar(baseVarName: string, profile?: ProfileName): string {
  if (!profile || profile.toUpperCase() === "P1") {
    return process.env[baseVarName] || "";
  }
  
  // Use profile-specific variables
  const profileVarName = `${baseVarName}_${profile.toUpperCase()}`;
  return process.env[profileVarName] || "";
}

/* Examples:
 *
 * INPUT                                      OUTPUT
 * getEnvVar("GMX_PRIVATE_KEY", undefined)    process.env.GMX_PRIVATE_KEY
 * getEnvVar("GMX_PRIVATE_KEY", "")           process.env.GMX_PRIVATE_KEY
 * getEnvVar("GMX_PRIVATE_KEY", "P1")         process.env.GMX_PRIVATE_KEY (for backward compatibility)
 * getEnvVar("GMX_PRIVATE_KEY", "p2")         process.env.GMX_PRIVATE_KEY_P2
 * getEnvVar("GMX_PRIVATE_KEY", "P3")         process.env.GMX_PRIVATE_KEY_P2
 * 
 * getEnvVar("GMX_PRIVATE_KEY", "custom")     process.env.GMX_PRIVATE_KEY_CUSTOM
*/