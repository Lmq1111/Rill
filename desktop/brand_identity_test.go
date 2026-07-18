package main

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"reasonix/internal/brand"
)

func TestWailsUsesRillDesktopIdentity(t *testing.T) {
	data, err := os.ReadFile("wails.json")
	if err != nil {
		t.Fatal(err)
	}
	var cfg struct {
		Name           string `json:"name"`
		OutputFilename string `json:"outputfilename"`
		Author         struct {
			Name string `json:"name"`
		} `json:"author"`
		Info struct {
			ProductName string `json:"productName"`
			Version     string `json:"productVersion"`
		} `json:"info"`
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		t.Fatal(err)
	}
	if cfg.Name != brand.ProductName || cfg.Info.ProductName != brand.ProductName {
		t.Fatalf("Wails product identity = name %q product %q, want %q", cfg.Name, cfg.Info.ProductName, brand.ProductName)
	}
	if cfg.OutputFilename != "rill-desktop" {
		t.Fatalf("Wails outputfilename = %q, want rill-desktop", cfg.OutputFilename)
	}
	if cfg.Info.Version != "0.1.0" {
		t.Fatalf("Wails productVersion = %q, want 0.1.0", cfg.Info.Version)
	}
	if cfg.Author.Name != "Lmq1111" {
		t.Fatalf("Wails author = %q, want Lmq1111", cfg.Author.Name)
	}
}

func TestDarwinTemplatesAndPackagingUseRillIdentity(t *testing.T) {
	for _, path := range []string{"build/darwin/Info.plist", "build/darwin/Info.dev.plist"} {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(data), "<string>"+brand.BundleID+"</string>") {
			t.Fatalf("%s does not declare bundle id %s", path, brand.BundleID)
		}
	}
	data, err := os.ReadFile("../scripts/desktop-build.sh")
	if err != nil {
		t.Fatal(err)
	}
	script := string(data)
	for _, want := range []string{
		`BINNAME="rill-desktop"`,
		`GUARDNAME="rill-guard"`,
		`BUNDLE_ID="` + brand.BundleID + `"`,
		`build/bin/${APPNAME}.app`,
		`./cmd/rill-guard`,
	} {
		if !strings.Contains(script, want) {
			t.Fatalf("desktop-build.sh missing Rill identity contract %q", want)
		}
	}
}

func TestRillIconUsesOriginalFlowMark(t *testing.T) {
	data, err := os.ReadFile("build/appicon.svg")
	if err != nil {
		t.Fatal(err)
	}
	svg := string(data)
	for _, want := range []string{"Three luminous streams", "intelligence nodes", "#0AA69B"} {
		if !strings.Contains(svg, want) {
			t.Fatalf("Rill icon is missing original flow-mark contract %q", want)
		}
	}
	for _, old := range []string{"M253.29,235.46", "Reasonix", "rhinoceros"} {
		if strings.Contains(svg, old) {
			t.Fatalf("Rill icon still contains upstream artwork marker %q", old)
		}
	}
}
