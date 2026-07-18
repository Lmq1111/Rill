package config

// MigrationResult is retained as an API shape for callers compiled against the
// upstream kernel. Rill never produces one because old-product migration is
// intentionally disabled.
type MigrationResult struct {
	From     string
	To       string
	KeyToEnv bool
	Plugins  int
	Warnings []string
}

func (r *MigrationResult) Notice() string { return "" }

// MCPGlobalMigrationResult is retained for API compatibility. Rill starts with
// an independent MCP configuration and never imports old-product data.
type MCPGlobalMigrationResult struct {
	To      string
	Added   int
	Sources int
}

func MigrateLegacyIfNeeded() (*MigrationResult, error) {
	return nil, nil
}

func MigrateLegacyIfNeededForRoot(string) (*MigrationResult, error) {
	return nil, nil
}

func MigrateLegacyCredentialsForRoot(string) error {
	return nil
}

func MigrateMCPToUserConfigOnUpgrade([]string) (*MCPGlobalMigrationResult, error) {
	return nil, nil
}
