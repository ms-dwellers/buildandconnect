$ErrorActionPreference = 'Stop'
$Task = if ($args.Count -gt 0) { [string]$args[0] } else { 'dev' }
$TaskArguments = @($args | Select-Object -Skip 1)
$ExitCode = 1

Push-Location -LiteralPath (Join-Path $PSScriptRoot '..')
try {
    $Node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $Node) {
        throw 'Install Node.js 26.13 or newer within version 26. See docs/development.md.'
    }

    $HelpRequested = $Task -in @('help', '--help', '-h')
    $Bun = $null
    $BunVersion = ''
    if (-not $HelpRequested) {
        $Bun = Get-Command bun -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $Bun) {
            throw 'Bun was not found. Install the version in package.json. See docs/development.md.'
        }
        $BunVersion = & $Bun.Source --version
        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to read the Bun version.'
        }
    }

    & $Node.Source scripts/check-development.mjs $Task $BunVersion
    $ExitCode = $LASTEXITCODE
    if ($ExitCode -eq 0 -and $Task -notin @('help', '--help', '-h')) {
        if ($Task -eq 'setup') {
            & $Bun.Source install --frozen-lockfile @TaskArguments
        }
        else {
            & $Bun.Source run $Task @TaskArguments
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
