Unicode true

####
## Rill per-user NSIS installer.
##
## This file is COMMITTED and customized (Wails leaves an existing project.nsi
## untouched and only regenerates wails_tools.nsh). The customizations vs.
## Wails' default template:
##
##   1. REQUEST_EXECUTION_LEVEL "user" + InstallDir under $LOCALAPPDATA - install
##      without administrator rights. This is what lets the auto-updater re-run a
##      freshly downloaded installer silently (`/S`) with no UAC prompt.
##   2. Uninstall registry under HKCU (not HKLM). Wails' wails.writeUninstaller /
##      wails.deleteUninstaller macros hard-code HKLM, which a non-admin install
##      cannot write - so we inline HKCU versions below instead.
##   3. InstallDir is remembered across updates via InstallDirRegKey +
##      InstallLocation (HKCU\...\Uninstall\InstallLocation). When upgrading from
##      a build that did not write InstallLocation yet, .onInit falls back to the
##      old DisplayIcon path before using the default. Without this, every release
##      forces the user back to %LOCALAPPDATA%\Programs\Rill even if they had
##      moved the install to a different drive (e.g. D:\Tools\Rill); the silent
##      auto-updater would re-run with /S into the wrong dir, leaving the old
##      install orphaned.
##
## Everything else mirrors Wails' generated default. Defines below override the
## ProjectInfo values that wails_tools.nsh would otherwise populate.
####

## Install per-user (no admin). Must be defined BEFORE including wails_tools.nsh,
## which only sets the "admin" default when REQUEST_EXECUTION_LEVEL is undefined.
!define REQUEST_EXECUTION_LEVEL "user"

####
## Include the wails tools (auto-generated; provides INFO_* defines and the
## wails.* macros used below).
####
!include "wails_tools.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support. https://nsis.sourceforge.io/Reference/ManifestDPIAware
ManifestDPIAware true

!include "MUI.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
# !define MUI_WELCOMEFINISHPAGE_BITMAP "resources\leftimage.bmp" #Include this to add a bitmap on the left side of the Welcome Page. Must be a size of 164x314
!define MUI_FINISHPAGE_NOAUTOCLOSE # Wait on the INSTFILES page so the user can take a look into the details of the installation steps
!define MUI_ABORTWARNING # This will warn the user if they exit from the installer.

!insertmacro MUI_PAGE_WELCOME # Welcome to the installer page.
# !insertmacro MUI_PAGE_LICENSE "resources\eula.txt" # Adds a EULA page to the installer
!insertmacro MUI_PAGE_DIRECTORY # In which folder install page.
!insertmacro MUI_PAGE_INSTFILES # Installing page.
!insertmacro MUI_PAGE_FINISH # Finished installation page.

!insertmacro MUI_UNPAGE_INSTFILES # Uinstalling page

!insertmacro MUI_LANGUAGE "English" # Set the Language of the installer

## The following two statements can be used to sign the installer and the uninstaller. The path to the binaries are provided in %1
#!uninstfinalize 'signtool --file "%1"'
#!finalize 'signtool --file "%1"'

Name "${INFO_PRODUCTNAME}"
OutFile "..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe" # Name of the installer's file.
!define RILLAGENT_DEFAULT_INSTALLDIR "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
!define RILLAGENT_UPDATE_HELPER "rill-update-helper.exe"
!define RILLAGENT_GUARD "rill-guard.exe"
!define RILLAGENT_LAUNCHER "rill-launcher.exe"
!define RILLAGENT_PORTABLE_ENTRY "Rill.exe"
!define RILLAGENT_UNLOCK_RETRIES 60
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation" # Reuse the previous install path on update; .onInit falls back to the default on first install.
InstallDir "${RILLAGENT_DEFAULT_INSTALLDIR}" # Per-user install location (no admin rights required).
ShowInstDetails show # This will always show the installation details.

####
## Per-user uninstaller registry (HKCU). Replaces wails.writeUninstaller /
## wails.deleteUninstaller, which write HKLM and would fail without admin rights.
####
!macro rillagent.writeUninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"

    WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${INFO_COMPANYNAME}"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${INFO_PRODUCTNAME}"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${INFO_PRODUCTVERSION}"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
    WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
    # Persist the resolved install path so a subsequent update picks it up
    # via InstallDirRegKey above. Without this, every release would force the
    # user back to %LOCALAPPDATA%\Programs\Rill even if they had moved
    # the install to a different drive (e.g. D:\Tools\Rill). The auto-
    # updater re-runs this installer with /S and trusts the persisted path,
    # so it has to be present before the silent re-install.
    WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"

    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" "$0"
!macroend

!macro rillagent.deleteUninstaller
    Delete "$INSTDIR\uninstall.exe"
    DeleteRegKey HKCU "${UNINST_KEY}"
!macroend

Function .onInit
   !insertmacro wails.checkArchitecture

   ; InstallDirRegKey leaves $INSTDIR empty when the InstallLocation value is
   ; missing. Older installers still wrote DisplayIcon, so use its parent folder
   ; as a compatibility bridge before falling back to the per-user default.
   StrCmp $INSTDIR "" 0 done
   ClearErrors
   ReadRegStr $0 HKCU "${UNINST_KEY}" "DisplayIcon"
   IfErrors fallback
   StrCmp $0 "" fallback
   ${GetParent} "$0" $INSTDIR
   StrCmp $INSTDIR "" fallback done

fallback:
   StrCpy $INSTDIR "${RILLAGENT_DEFAULT_INSTALLDIR}"
done:
FunctionEnd

Function rillagent.waitForExecutableUnlock
   StrCpy $0 0

retry:
   IfFileExists "$INSTDIR\${PRODUCT_EXECUTABLE}" 0 check_guard
   ClearErrors
   FileOpen $1 "$INSTDIR\${PRODUCT_EXECUTABLE}" a
   IfErrors locked
   FileClose $1

check_guard:
   IfFileExists "$INSTDIR\${RILLAGENT_GUARD}" 0 check_launcher
   ClearErrors
   FileOpen $1 "$INSTDIR\${RILLAGENT_GUARD}" a
   IfErrors locked
   FileClose $1

check_launcher:
   IfFileExists "$INSTDIR\${RILLAGENT_LAUNCHER}" 0 check_portable_entry
   ClearErrors
   FileOpen $1 "$INSTDIR\${RILLAGENT_LAUNCHER}" a
   IfErrors locked
   FileClose $1

check_portable_entry:
   IfFileExists "$INSTDIR\${RILLAGENT_PORTABLE_ENTRY}" 0 done
   ClearErrors
   FileOpen $1 "$INSTDIR\${RILLAGENT_PORTABLE_ENTRY}" a
   IfErrors locked
   FileClose $1
   Goto done

locked:
   IntOp $0 $0 + 1
   IntCmp $0 ${RILLAGENT_UNLOCK_RETRIES} failed 0 0
   Sleep 1000
   Goto retry

failed:
   IfSilent silent interactive

interactive:
   MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Rill is still running. Close Rill, then click Retry to continue the installation." IDRETRY retry IDCANCEL abort
   Goto retry

silent:
   SetErrorLevel 1618

abort:
   Abort "Rill is still running. Close Rill and run the installer again."

done:
FunctionEnd

Section
    !insertmacro wails.setShellContext

    !insertmacro wails.webview2runtime

    Call rillagent.waitForExecutableUnlock

    SetOutPath $INSTDIR

    !insertmacro wails.files
    !if /FileExists "${RILLAGENT_UPDATE_HELPER}"
    File "/oname=${RILLAGENT_UPDATE_HELPER}" "${RILLAGENT_UPDATE_HELPER}"
    !else
    !warning "${RILLAGENT_UPDATE_HELPER} was not found; Windows auto-update will fail safely until the helper is installed."
    !endif
    !if /FileExists "${RILLAGENT_GUARD}"
    File "/oname=${RILLAGENT_GUARD}" "${RILLAGENT_GUARD}"
    !endif
    !if /FileExists "${RILLAGENT_LAUNCHER}"
    File "/oname=${RILLAGENT_LAUNCHER}" "${RILLAGENT_LAUNCHER}"
    ; Portable archives expose Rill.exe as a second copy of the Guard
    ; launcher. Preserve that layout only when upgrading an existing portable
    ; directory, and keep the alias in lockstep with the canonical launcher.
    IfFileExists "$INSTDIR\${RILLAGENT_PORTABLE_ENTRY}" 0 rillagent_no_portable_entry
    File "/oname=${RILLAGENT_PORTABLE_ENTRY}" "${RILLAGENT_LAUNCHER}"
rillagent_no_portable_entry:
    ; Keep the Guard launcher as the target while taking the visible shortcut
    ; icon from the Wails application. The launcher embeds the same icon too,
    ; but an explicit icon source prevents stale/generic taskbar pins after an
    ; in-place upgrade from a launcher build that had no Windows resources.
    CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${RILLAGENT_LAUNCHER}" "launch --detach" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${RILLAGENT_LAUNCHER}" "launch --detach" "$INSTDIR\${PRODUCT_EXECUTABLE}" 0
    !else
    CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    !endif

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols

    !insertmacro rillagent.writeUninstaller
SectionEnd

Section "uninstall"
    !insertmacro wails.setShellContext

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}" # Remove the WebView2 DataPath

    ; Precision uninstall: delete main application files
    Delete "$INSTDIR\${PRODUCT_EXECUTABLE}"
    Delete "$INSTDIR\${RILLAGENT_UPDATE_HELPER}"
    Delete "$INSTDIR\${RILLAGENT_GUARD}"
    Delete "$INSTDIR\${RILLAGENT_LAUNCHER}"
    Delete "$INSTDIR\${RILLAGENT_PORTABLE_ENTRY}"

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro rillagent.deleteUninstaller

    ; Only remove the installation directory if it is empty to prevent data loss
    RMDir $INSTDIR
SectionEnd
