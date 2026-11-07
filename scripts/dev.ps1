$ErrorActionPreference = 'Stop'
$Task = if ($args.Count -gt 0) { [string]$args[0] } else { 'dev' }
$TaskArguments = @($args | Select-Object -Skip 1)
$ExitCode = 1

Push-Location -LiteralPath (Join-Path $PSScriptRoot '..')
try {
    $Node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $Node) {
        throw 'Install Node.js 26.13 or newer within version 26, including npm. See docs/development.md.'
    }

    & $Node.Source scripts/check-development.mjs $Task
    $ExitCode = $LASTEXITCODE
    if ($ExitCode -eq 0 -and $Task -notin @('help', '--help', '-h')) {
        $NpmName = if ($env:OS -eq 'Windows_NT') { 'npm.cmd' } else { 'npm' }
        $Npm = Get-Command $NpmName -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $Npm) {
            $ExitCode = 1
            throw 'npm was not found. Install npm alongside Node.js.'
        }

        if ($Task -eq 'setup') {
            & $Npm.Source ci @TaskArguments
        }
        else {
            & $Npm.Source run $Task -- @TaskArguments
        }
        $ExitCode = $LASTEXITCODE
    }
}
catch {
    $ExitCode = 1
    [Console]::Error.WriteLine($_.Exception.Message)
}
finally {
    Pop-Location
}

exit $ExitCode
