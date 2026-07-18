//go:build darwin

package main

/*
#cgo darwin LDFLAGS: -framework Cocoa
void installRillSystemQuitHook(void);
*/
import "C"

import "sync"

var installSystemQuitHookOnce sync.Once

func installSystemQuitHook() {
	installSystemQuitHookOnce.Do(func() {
		C.installRillSystemQuitHook()
	})
}

//export RillMarkSystemQuit
func RillMarkSystemQuit() {
	markSystemQuitRequested()
}
