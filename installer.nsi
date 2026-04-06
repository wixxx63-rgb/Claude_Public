; Narrative Flow - NSIS Installer Script
Unicode True

!define APP_NAME "Narrative Flow"
!define APP_VERSION "1.0.0"
!define APP_EXE "Narrative Flow.exe"
!define APP_PUBLISHER "Narrative Flow"
; Install to AppData\Local\Programs — no admin/UAC needed (like Chrome, Discord, VS Code)
!define INSTALL_DIR "$LOCALAPPDATA\Programs\Narrative Flow"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\NarrativeFlow"

Name "${APP_NAME}"
OutFile "release\Narrative Flow Setup 1.0.0.exe"
InstallDir "${INSTALL_DIR}"
InstallDirRegKey HKCU "Software\NarrativeFlow" "InstallDir"
; user level = no UAC prompt required
RequestExecutionLevel user
SetCompressor /SOLID lzma

; Modern UI
!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "resources\icon.ico"
!define MUI_UNICON "resources\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ─── Install ─────────────────────────────────────────────────────────────────
Section "Install"
  SetOutPath "$INSTDIR"

  ; Copy all app files recursively
  File /r "release\win-unpacked\*.*"

  ; Store install dir
  WriteRegStr HKCU "Software\NarrativeFlow" "InstallDir" "$INSTDIR"

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Add/Remove Programs entry (HKCU = no admin needed)
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "EstimatedSize" 262144
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1

  ; Desktop shortcut
  CreateShortcut "$DESKTOP\Narrative Flow.lnk" "$INSTDIR\${APP_EXE}"

  ; Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\Narrative Flow"
  CreateShortcut "$SMPROGRAMS\Narrative Flow\Narrative Flow.lnk" "$INSTDIR\${APP_EXE}"
  CreateShortcut "$SMPROGRAMS\Narrative Flow\Uninstall.lnk" "$INSTDIR\Uninstall.exe"

SectionEnd

; ─── Uninstall ───────────────────────────────────────────────────────────────
Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$DESKTOP\Narrative Flow.lnk"
  RMDir /r "$SMPROGRAMS\Narrative Flow"

  ; Remove registry entries
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "Software\NarrativeFlow"

SectionEnd
