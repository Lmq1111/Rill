// Package brand is the single Go source of truth for public Rill product
// identifiers. Internal module/import paths intentionally remain reasonix.
package brand

const (
	ProductName   = "Rill"
	Slogan        = "Let intelligence flow."
	CLIBrand      = "Rillagent"
	Executable    = "rillagent"
	BundleID      = "io.github.lmq1111.rill"
	ProjectConfig = "rillagent.toml"
	ProjectDir    = ".rillagent"
)

// Version is overridden in release builds with
// -X reasonix/internal/brand.Version=<version>.
var Version = "0.1.0"
