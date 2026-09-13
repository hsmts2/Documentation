param(
    [string]$OutputRoot = (Join-Path (Split-Path -Parent $PSScriptRoot) 'qa-netbios')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/img/workspaces-skill-transfer/workspaces-managed-ad'
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$edits = @(
    @{ File = '007-ディレクトリのエディションとドメイン名の入力.png'; X = 562; Y = 725; Width = 88; Height = 21; Text = 'ad'; TextX = 562; TextY = 725; Size = 13; Color = '#232f3e'; Background = '#ffffff' }
    @{ File = '008-adminパスワードと確認用パスワードの入力.png'; X = 555; Y = 725; Width = 88; Height = 21; Text = 'ad'; TextX = 555; TextY = 725; Size = 13; Color = '#232f3e'; Background = '#ffffff' }
    @{ File = '009-vpcと異なるazに属する2つのサブネットの選択.png'; X = 562; Y = 400; Width = 143; Height = 21; Text = 'ad-pri-sub-002-002a'; TextX = 562; TextY = 400; Size = 13; Color = '#232f3e'; Background = '#ffffff' }
    @{ File = '009-vpcと異なるazに属する2つのサブネットの選択.png'; X = 562; Y = 440; Width = 143; Height = 21; Text = 'ad-pri-sub-002-002c'; TextX = 562; TextY = 440; Size = 13; Color = '#232f3e'; Background = '#ffffff' }
    @{ File = '010-ディレクトリ作成前の設定確認.png'; X = 954; Y = 505; Width = 68; Height = 22; Text = 'ad'; TextX = 954; TextY = 505; Size = 13; Color = '#111827'; Background = '#ffffff' }
)

foreach ($group in ($edits | Group-Object File)) {
    $source = Join-Path $sourceRoot $group.Name
    $target = Join-Path $OutputRoot $group.Name
    $bitmap = [System.Drawing.Bitmap]::new($source)
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            foreach ($edit in $group.Group) {
                $background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($edit.Background))
                $foreground = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($edit.Color))
                $font = [System.Drawing.Font]::new('Arial', [single]$edit.Size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
                try {
                    $graphics.FillRectangle($background, $edit.X, $edit.Y, $edit.Width, $edit.Height)
                    $graphics.DrawString($edit.Text, $font, $foreground, [single]$edit.TextX, [single]$edit.TextY, [System.Drawing.StringFormat]::GenericTypographic)
                } finally {
                    $font.Dispose()
                    $foreground.Dispose()
                    $background.Dispose()
                }
            }
        } finally {
            $graphics.Dispose()
        }
        $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $bitmap.Dispose()
    }
    Write-Output $target
}
