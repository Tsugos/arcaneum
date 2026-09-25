$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = [System.IO.Path]::Combine($desktopPath, "Arcaneum AI Studio.lnk")
$targetPath = "c:\Users\reali\Documents\antigravity\resilient-bohr\run_arcaneum.bat"
$workingDir = "c:\Users\reali\Documents\antigravity\resilient-bohr"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $workingDir
$shortcut.Description = "Arcaneum AI Studio OS Launcher"
$shortcut.Save()

Write-Host "Shortcut successfully created at: $shortcutPath"
