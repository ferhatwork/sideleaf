# Sideleaf - Generate Windows/PWA brand icons from the supplied app icon.
# Uses Windows' built-in System.Drawing so no extra image package is required.

$ErrorActionPreference = 'Stop'

$rootDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$publicDir = Join-Path $rootDir 'public'
$sourcePath = Join-Path $publicDir 'sideleaf-appicon.png'

if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source app icon not found: $sourcePath"
}

Add-Type -AssemblyName System.Drawing

function New-PngBytes {
    param([int]$Size)

    $source = $null
    $bitmap = $null
    $graphics = $null
    $stream = $null

    try {
        $source = [System.Drawing.Image]::FromFile($sourcePath)
        $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $Size, $Size))

        $stream = New-Object System.IO.MemoryStream
        $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        return $stream.ToArray()
    }
    finally {
        if ($stream) { $stream.Dispose() }
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        if ($source) { $source.Dispose() }
    }
}

function Save-Png {
    param([int]$Size, [string]$Path)

    [System.IO.File]::WriteAllBytes($Path, (New-PngBytes -Size $Size))
}

function Save-Ico {
    param([string]$Path)

    $sizes = @(256, 128, 64, 48, 32, 16)
    $frames = @($sizes | ForEach-Object { New-PngBytes -Size $_ })
    $headerSize = 6
    $entrySize = 16
    $offset = $headerSize + ($entrySize * $frames.Count)

    $stream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($stream)
    try {
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]$frames.Count)

        for ($i = 0; $i -lt $frames.Count; $i++) {
            $size = $sizes[$i]
            $width = if ($size -ge 256) { 0 } else { $size }
            $writer.Write([byte]$width)
            $writer.Write([byte]$width)
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([uint16]1)
            $writer.Write([uint16]32)
            $writer.Write([uint32]$frames[$i].Length)
            $writer.Write([uint32]$offset)
            $offset += $frames[$i].Length
        }

        foreach ($frame in $frames) {
            $writer.Write($frame)
        }

        $writer.Flush()
        [System.IO.File]::WriteAllBytes($Path, $stream.ToArray())
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

Save-Png -Size 192 -Path (Join-Path $publicDir 'sideleaf-appicon-v2-192.png')
Save-Png -Size 512 -Path (Join-Path $publicDir 'sideleaf-appicon-v2-512.png')
Copy-Item -LiteralPath (Join-Path $publicDir 'sideleaf-appicon-v2-192.png') -Destination (Join-Path $publicDir 'icon-192.png') -Force
Copy-Item -LiteralPath (Join-Path $publicDir 'sideleaf-appicon-v2-512.png') -Destination (Join-Path $publicDir 'icon-512.png') -Force

$versionedIco = Join-Path $publicDir 'sideleaf-appicon-v2.ico'
Save-Ico -Path $versionedIco
Copy-Item -LiteralPath $versionedIco -Destination (Join-Path $publicDir 'icon.ico') -Force
Copy-Item -LiteralPath $versionedIco -Destination (Join-Path $rootDir 'icon.ico') -Force

Write-Host "Generated Sideleaf v2 PNG and ICO assets from $sourcePath" -ForegroundColor Green
