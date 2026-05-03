#define AppName "Yomi"
#define AppVersion "1.0.0"
#define AppExe "yomi-win_x64.exe"
#define AppPublisher "yuuha"

[Setup]
AppId={{E4A2F1C3-7B8D-4F9E-A2B1-6C3D5E8F0A1B}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=.
OutputBaseFilename=yomi_setup
SetupIconFile=..\resources\icons\appIcon.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; 管理者権限不要でインストール可能
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"

[Tasks]
Name: "desktopicon";    Description: "デスクトップにショートカットを作成"; GroupDescription: "追加タスク:"; Flags: unchecked
Name: "sendtoicon";     Description: "「送る」メニューに追加";             GroupDescription: "追加タスク:"
Name: "quicklaunch";    Description: "スタートアップに追加（ログイン時に起動）"; GroupDescription: "追加タスク:"; Flags: unchecked

[Files]
; メインバイナリ
Source: "..\dist\yomi\{#AppExe}";       DestDir: "{app}"; Flags: ignoreversion
; リソース（埋め込み済みのため不要だが念のため）
Source: "..\dist\yomi\resources.neu";   DestDir: "{app}"; Flags: ignoreversion

[Icons]
; スタートメニュー
Name: "{group}\{#AppName}";             Filename: "{app}\{#AppExe}"; IconFilename: "{app}\{#AppExe}"
Name: "{group}\{#AppName} をアンインストール"; Filename: "{uninstallexe}"
; デスクトップ（タスク選択時のみ）
Name: "{autodesktop}\{#AppName}";       Filename: "{app}\{#AppExe}"; Tasks: desktopicon
; スタートアップ（タスク選択時のみ）
Name: "{userstartup}\{#AppName}";       Filename: "{app}\{#AppExe}"; Tasks: quicklaunch

[Run]
; インストール完了後に起動するか選択
Filename: "{app}\{#AppExe}"; Description: "{#AppName} を起動"; Flags: nowait postinstall skipifsilent

[Code]
// 「送る」メニューへのショートカット追加・削除
procedure CreateSendToShortcut();
var
  SendToPath: string;
  Shell: Variant;
  Shortcut: Variant;
begin
  SendToPath := ExpandConstant('{sendto}\{#AppName}.lnk');
  Shell := CreateOleObject('WScript.Shell');
  Shortcut := Shell.CreateShortcut(SendToPath);
  Shortcut.TargetPath := ExpandConstant('{app}\{#AppExe}');
  Shortcut.Description := '{#AppName}';
  Shortcut.Save();
end;

procedure DeleteSendToShortcut();
var
  SendToPath: string;
begin
  SendToPath := ExpandConstant('{sendto}\{#AppName}.lnk');
  if FileExists(SendToPath) then
    DeleteFile(SendToPath);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    if WizardIsTaskSelected('sendtoicon') then
      CreateSendToShortcut();
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    DeleteSendToShortcut();
end;
