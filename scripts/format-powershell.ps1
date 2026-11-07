param(
    [switch]$Check,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$Version = '1.25.0'
$Root = Split-Path -Parent $PSScriptRoot
$ModuleDirectory = Join-Path $Root '.tools/powershell'
$ModulePath = Join-Path $ModuleDirectory "PSScriptAnalyzer/$Version/PSScriptAnalyzer.psd1"

if ($Install) {
    New-Item -ItemType Directory -Path $ModuleDirectory -Force | Out-Null
    Save-Module -Name PSScriptAnalyzer -RequiredVersion $Version -Repository PSGallery -Path $ModuleDirectory
}
if (-not (Test-Path -LiteralPath $ModulePath)) {
    throw 'Install the pinned formatter first: pwsh -NoProfile -File scripts/format-powershell.ps1 -Install'
}
Import-Module $ModulePath -Force

$Failed = $false
foreach ($File in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1') {
    $Source = [IO.File]::ReadAllText($File.FullName).Replace("`r`n", "`n")
    $Formatted = (Invoke-Formatter -ScriptDefinition $Source).Replace("`r`n", "`n")
    if ($Check -and $Source -cne $Formatted) {
        [Console]::Error.WriteLine("Formatting differs: $($File.Name)")
        $Failed = $true
    }
    elseif (-not $Check) {
        [IO.File]::WriteAllText($File.FullName, $Formatted, [Text.UTF8Encoding]::new($false))
    }
    $Findings = @(Invoke-ScriptAnalyzer -Path $File.FullName -Severity Error)
    if ($Findings.Count -gt 0) {
        $Findings | Format-Table -AutoSize
        $Failed = $true
    }
}
if ($Failed) { exit 1 }
