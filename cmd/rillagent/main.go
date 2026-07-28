// Command rillagent is the Rillagent coding agent CLI.
package main

import (
	"os"

	"reasonix/internal/brand"
	"reasonix/internal/cli"
	"reasonix/internal/secrets"

	// Blank imports wire compile-time built-ins into their registries.
	_ "reasonix/internal/provider/anthropic"
	_ "reasonix/internal/provider/openai"
	_ "reasonix/internal/tool/builtin"
)

func main() {
	secrets.SanitizeProcessEnvironment()
	os.Exit(cli.Run(os.Args[1:], brand.Version))
}
