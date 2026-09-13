param(
    [string]$OutputRoot = (Join-Path (Split-Path -Parent $PSScriptRoot) 'qa-managed-ad-users')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/img/workspaces-skill-transfer/workspaces-managed-ad'
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$reference = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot '028-削除対象ユーザーと削除アクションの選択.png'))
try {
    $groupName = '020-追加先グループの検索.png'
    $groupImage = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot $groupName))
    try {
        # The directory card is shifted 52 pixels left in this narrower capture.
        $sourceRect = [System.Drawing.Rectangle]::new(686, 270, 90, 24)
        $targetRect = [System.Drawing.Rectangle]::new(634, 270, 90, 24)
        $graphics = [System.Drawing.Graphics]::FromImage($groupImage)
        try {
            $graphics.DrawImage($reference, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        } finally {
            $graphics.Dispose()
        }
        $groupImage.Save((Join-Path $OutputRoot $groupName), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $groupImage.Dispose()
    }

    $deleteName = '029-ユーザーアカウント削除前の最終確認.png'
    $deleteImage = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot $deleteName))
    try {
        # Match the modal's dimming layer, derived from unchanged pixels in both captures.
        foreach ($rect in @(
            [System.Drawing.Rectangle]::new(686, 211, 190, 23),
            [System.Drawing.Rectangle]::new(686, 270, 90, 24)
        )) {
            for ($y = $rect.Top; $y -lt $rect.Bottom; $y++) {
                for ($x = $rect.Left; $x -lt $rect.Right; $x++) {
                    $pixel = $reference.GetPixel($x, $y)
                    if ($pixel.R -ge 250 -and $pixel.G -ge 250 -and $pixel.B -ge 250) {
                        $color = [System.Drawing.Color]::FromArgb(101, 106, 115)
                    } else {
                        $r = [Math]::Clamp([int][Math]::Round(0.29928 * $pixel.R + 24.70), 0, 255)
                        $g = [Math]::Clamp([int][Math]::Round(0.29786 * $pixel.G + 30.05), 0, 255)
                        $b = [Math]::Clamp([int][Math]::Round(0.29738 * $pixel.B + 39.15), 0, 255)
                        $color = [System.Drawing.Color]::FromArgb($r, $g, $b)
                    }
                    $deleteImage.SetPixel($x, $y, $color)
                }
            }
        }
        $deleteImage.Save((Join-Path $OutputRoot $deleteName), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $deleteImage.Dispose()
    }
} finally {
    $reference.Dispose()
}

Get-ChildItem -LiteralPath $OutputRoot -File | Select-Object -ExpandProperty FullName
