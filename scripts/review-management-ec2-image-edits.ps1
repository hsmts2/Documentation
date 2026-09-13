param(
    [string]$OutputRoot = (Join-Path (Split-Path -Parent $PSScriptRoot) 'qa-management-ec2/edited')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/img/workspaces-skill-transfer'
$sourceRoot = Join-Path $assetRoot 'workspaces-management-ec2'
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

function Copy-Pixels {
    param(
        [System.Drawing.Bitmap]$Source,
        [System.Drawing.Bitmap]$Target,
        [System.Drawing.Rectangle]$From,
        [System.Drawing.Point]$To
    )
    for ($y = 0; $y -lt $From.Height; $y++) {
        for ($x = 0; $x -lt $From.Width; $x++) {
            $Target.SetPixel($To.X + $x, $To.Y + $y, $Source.GetPixel($From.X + $x, $From.Y + $y))
        }
    }
}

function Fill-From-Row {
    param([System.Drawing.Bitmap]$Image, [System.Drawing.Rectangle]$Rect, [int]$SampleX)
    for ($y = $Rect.Top; $y -lt $Rect.Bottom; $y++) {
        $color = $Image.GetPixel($SampleX, $y)
        for ($x = $Rect.Left; $x -lt $Rect.Right; $x++) {
            $Image.SetPixel($x, $y, $color)
        }
    }
}

function Draw-UiText {
    param([System.Drawing.Bitmap]$Image, [string]$Value, [int]$X, [int]$Y, [int]$Size, [System.Drawing.Color]$Color)
    $graphics = [System.Drawing.Graphics]::FromImage($Image)
    $font = [System.Drawing.Font]::new('Segoe UI', $Size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new($Color)
    try {
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $graphics.DrawString($Value, $font, $brush, [float]$X, [float]$Y)
    } finally {
        $brush.Dispose()
        $font.Dispose()
        $graphics.Dispose()
    }
}

function Save-Edit {
    param([string]$Name, [scriptblock]$Edit)
    $image = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot $Name))
    try {
        & $Edit $image
        $image.Save((Join-Path $OutputRoot $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $image.Dispose()
    }
}

$awsDirectory = [System.Drawing.Bitmap]::new((Join-Path $assetRoot 'workspaces-managed-ad/013-ユーザーとグループの管理機能が無効の状態.png'))
$serverManager = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot '005-管理用ec2インスタンスのドメイン参加確認.png'))
$gpmcTree = [System.Drawing.Bitmap]::new((Join-Path $sourceRoot '011-default-domain-policyのアカウントポリシー確認.png'))
try {
    Save-Edit '001-directory-serviceから管理用ec2インスタンスの起動画面を開く.png' {
        param($image)
        Copy-Pixels $awsDirectory $image ([System.Drawing.Rectangle]::new(634, 270, 105, 24)) ([System.Drawing.Point]::new(634, 270))
    }

    Save-Edit '007-管理用ec2インスタンスのドメイン参加確認.png' {
        param($image)
        Copy-Pixels $serverManager $image ([System.Drawing.Rectangle]::new(429, 251, 190, 29)) ([System.Drawing.Point]::new(429, 251))
    }

    Save-Edit '009-ドメインユーザー資格情報の入力例.png' {
        param($image)
        Fill-From-Row $image ([System.Drawing.Rectangle]::new(802, 688, 85, 20)) 900
        Draw-UiText $image 'ad' 804 689 12 ([System.Drawing.Color]::FromArgb(58, 58, 58))
    }

    Save-Edit '010-gpmcでaws-managed-microsoft-adのgpo一覧を確認.png' {
        param($image)
        Fill-From-Row $image ([System.Drawing.Rectangle]::new(198, 334, 293, 18)) 495
        Copy-Pixels $gpmcTree $image ([System.Drawing.Rectangle]::new(208, 355, 102, 18)) ([System.Drawing.Point]::new(208, 334))
        $graphics = [System.Drawing.Graphics]::FromImage($image)
        $red = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(228, 0, 40))
        try {
            $graphics.FillRectangle($red, 198, 351, 293, 4)
            $graphics.FillRectangle($red, 198, 351, 4, 26)
            $graphics.FillRectangle($red, 487, 351, 4, 26)
        } finally {
            $red.Dispose()
            $graphics.Dispose()
        }
    }

    Save-Edit '012-gpmcの参照先ドメインコントローラー変更メニュー.png' {
        param($image)
        Fill-From-Row $image ([System.Drawing.Rectangle]::new(82, 141, 113, 17)) 185
        Draw-UiText $image 'ad.example.com' 83 141 12 ([System.Drawing.Color]::FromArgb(45, 45, 45))
    }

    Save-Edit '013-gpmcの参照先ドメインコントローラー選択.png' {
        param($image)
        Fill-From-Row $image ([System.Drawing.Rectangle]::new(36, 146, 128, 21)) 180
        Draw-UiText $image 'ad.example.com' 39 145 12 ([System.Drawing.Color]::FromArgb(44, 44, 44))
    }
} finally {
    $awsDirectory.Dispose()
    $serverManager.Dispose()
    $gpmcTree.Dispose()
}

Get-ChildItem -LiteralPath $OutputRoot -File | Select-Object -ExpandProperty FullName
