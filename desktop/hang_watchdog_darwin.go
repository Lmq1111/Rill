//go:build darwin

package main

/*
#include <stdint.h>
#include <dispatch/dispatch.h>

extern void rillDesktopMainHeartbeat(void);

static dispatch_source_t rill_main_heartbeat_timer;

static void rill_main_heartbeat_handler(void *ctx) {
	rillDesktopMainHeartbeat();
}

static void rill_start_main_heartbeat(uint64_t interval_ms) {
	if (rill_main_heartbeat_timer != NULL) {
		return;
	}
	rill_main_heartbeat_timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_main_queue());
	dispatch_set_context(rill_main_heartbeat_timer, NULL);
	dispatch_source_set_event_handler_f(rill_main_heartbeat_timer, rill_main_heartbeat_handler);
	dispatch_source_set_timer(rill_main_heartbeat_timer, dispatch_time(DISPATCH_TIME_NOW, 0), interval_ms * NSEC_PER_MSEC, 100 * NSEC_PER_MSEC);
	dispatch_resume(rill_main_heartbeat_timer);
}

static void rill_stop_main_heartbeat(void) {
	if (rill_main_heartbeat_timer == NULL) {
		return;
	}
	dispatch_source_cancel(rill_main_heartbeat_timer);
	rill_main_heartbeat_timer = NULL;
}
*/
import "C"

import "time"

func mainThreadWatchdogSupported() bool {
	return true
}

func startNativeMainThreadHeartbeat(intervalMS uint64) {
	C.rill_start_main_heartbeat(C.uint64_t(intervalMS))
}

func stopNativeMainThreadHeartbeat() {
	C.rill_stop_main_heartbeat()
}

//export rillDesktopMainHeartbeat
func rillDesktopMainHeartbeat() {
	recordMainThreadHeartbeat(time.Now())
}
