package main

import (
	"fmt"
	"os"
	"strings"
	"testing"
)

func TestDesktopPackagesUseGuardAsDefaultLauncher(t *testing.T) {
	buildData, err := os.ReadFile("../scripts/desktop-build.sh")
	if err != nil {
		t.Fatal(err)
	}
	build := string(buildData)
	for _, want := range []string{
		`cp "$guard_out" "$app/Contents/MacOS/$GUARDNAME"`,
		`Set :CFBundleExecutable $GUARDNAME`,
		`Print :CFBundleIconFile`,
		`Contents/Resources/$bundle_icon`,
		`cp "$portable" "$staging/$BINNAME.exe"`,
		`-H windowsgui`,
		`stamp_windows_executable "$guard_out" "Rill Guard"`,
		`stamp_windows_executable "$launcher_out" "Rill Launcher"`,
		`stamp_windows_executable "build/windows/installer/$UPDATE_HELPER" "Rill Update Helper"`,
		`cp "$launcher_out" "$staging/${APPNAME}.exe"`,
		`cp "$guard_out" "$staging/$GUARDNAME.exe"`,
	} {
		if !strings.Contains(build, want) {
			t.Errorf("desktop-build.sh missing guard launcher contract %q", want)
		}
	}
	launcherStamp := strings.Index(build, `stamp_windows_executable "$launcher_out" "Rill Launcher"`)
	portableCopy := strings.Index(build, `cp "$launcher_out" "$staging/${APPNAME}.exe"`)
	if launcherStamp < 0 || portableCopy < 0 || launcherStamp > portableCopy {
		t.Fatalf("portable Rill.exe must copy the already-stamped launcher (stamp=%d copy=%d)", launcherStamp, portableCopy)
	}

	linuxData, err := os.ReadFile("build/linux/rill.desktop")
	if err != nil {
		t.Fatal(err)
	}
	linux := string(linuxData)
	for _, want := range []string{
		"Exec=rill-guard launch --detach",
		"Icon=rill-desktop",
		"StartupWMClass=rill-desktop",
	} {
		if !strings.Contains(linux, want) {
			t.Errorf("Linux desktop entry missing identity contract %q", want)
		}
	}
	nfpmData, err := os.ReadFile("build/linux/nfpm.yaml")
	if err != nil {
		t.Fatal(err)
	}
	nfpm := string(nfpmData)
	for _, size := range []int{16, 24, 32, 48, 64, 128, 256, 512} {
		asset := fmt.Sprintf("build/linux/icons/hicolor/%dx%d/apps/rill-desktop.png", size, size)
		if stat, err := os.Stat(asset); err != nil || stat.Size() == 0 {
			t.Errorf("Linux app icon %s is missing or empty", asset)
		}
		destination := fmt.Sprintf("/usr/share/icons/hicolor/%dx%d/apps/rill-desktop.png", size, size)
		if !strings.Contains(nfpm, destination) {
			t.Errorf("Linux package does not install %s", destination)
		}
	}
	for _, want := range []string{
		"/usr/share/applications/rill.desktop",
		"/usr/share/pixmaps/rill-desktop.png",
		"/usr/share/icons/hicolor/scalable/apps/rill-desktop.svg",
	} {
		if !strings.Contains(nfpm, want) {
			t.Errorf("Linux package missing desktop identity asset %q", want)
		}
	}

	windowsData, err := os.ReadFile("build/windows/installer/project.nsi")
	if err != nil {
		t.Fatal(err)
	}
	windows := string(windowsData)
	for _, want := range []string{
		`CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${RILLAGENT_LAUNCHER}" "launch --detach" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0`,
		`CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${RILLAGENT_LAUNCHER}" "launch --detach" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0`,
	} {
		if !strings.Contains(windows, want) {
			t.Errorf("Windows installer missing guard shortcut contract %q", want)
		}
	}
}
