param(
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root 'index.html'
$content = [System.IO.File]::ReadAllText($indexPath)
$newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$errors = [System.Collections.Generic.List[string]]::new()
$pageInside = -join @([char]0x30DA, [char]0x30FC, [char]0x30B8, [char]0x5185)

$sidebarMatch = [regex]::Match(
    $content,
    '(?s)<aside id="site-sidebar" class="sidebar" aria-label="Page list">(.*?)</aside>'
)

if (-not $sidebarMatch.Success) {
    throw 'Sidebar marker not found in index.html'
}

$groupMatches = [regex]::Matches(
    $sidebarMatch.Groups[1].Value,
    '(?s)<p class="sidebar-group"><span class="sidebar-group-icon" aria-hidden="true">.*?</span>([^<]+)</p>(.*?)(?=<p class="sidebar-group">|$)'
)
# Build the home directory from the visible sidebar, so new pages and hidden
# pages use the same source of truth as the navigation.
$sectionIdsByLabel = @{
    '記事' = 'articles'
    '[PoC] マルチVPC・閉域VDI基盤案件' = 'poc'
    'Git / GitHub' = 'git-github'
    'Terraform' = 'terraform'
    'IaC' = 'iac'
    'AWS' = 'aws-cloud'
    'OS／ミドルウェア' = 'os-server'
    'リファレンス' = 'reference'
}
$sidebarLinks = @{}
$homeSections = @(
    for ($groupIndex = 0; $groupIndex -lt $groupMatches.Count; $groupIndex++) {
        $group = $groupMatches[$groupIndex]
        $label = $group.Groups[1].Value
        $icon = [regex]::Match($group.Value, '<span class="sidebar-group-icon" aria-hidden="true">(.*?)</span>').Groups[1].Value
        $files = @(
            foreach ($link in [regex]::Matches($group.Groups[2].Value, '<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)</a>')) {
                $href = $link.Groups[1].Value
                if ($href -notmatch '^(?:tutorials/)?[^/]+\.html$') {
                    throw "Unexpected sidebar document URL: $href"
                }
                $file = $href -replace '^tutorials/', ''
                if ($sidebarLinks.ContainsKey($file)) {
                    throw "Duplicate sidebar document: $file"
                }
                $sidebarLinks[$file] = $link.Groups[2].Value
                $file
            }
        )
        if ($files.Count -eq 0) { throw "Sidebar category has no documents: $label" }
        $id = if ($sectionIdsByLabel.ContainsKey($label)) { $sectionIdsByLabel[$label] } else { "category-$groupIndex" }
        [pscustomobject]@{ Id = $id; Icon = $icon; Label = $label; Files = $files }
    }
)

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('      <!-- home-groups:start -->')
$lines.Add('      <section class="document-directory" aria-labelledby="technical-documents-title">')
$lines.Add('        <h2 id="technical-documents-title" class="home-section-title">技術ドキュメント</h2>')
$lines.Add('        <div class="document-directory-grid">')

foreach ($section in $homeSections) {
    for ($fileIndex = 0; $fileIndex -lt $section.Files.Count; $fileIndex++) {
        $file = $section.Files[$fileIndex]
        if (-not $sidebarLinks.ContainsKey($file)) {
            $errors.Add("Sidebar link not found for: $file")
            continue
        }

        $isRootFile = $file -eq 'writing-style-guide.html'
        $href = if ($isRootFile) { $file } else { "tutorials/$file" }
        $filePath = if ($isRootFile) { Join-Path $root $file } else { Join-Path (Join-Path $root 'tutorials') $file }

        if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            $errors.Add("Document file not found: $file")
            continue
        }

        $documentContent = [System.IO.File]::ReadAllText($filePath)
        $descriptionMatch = [regex]::Match($documentContent, '<meta\s+name="description"\s+content="([^"]+)"')

        if (-not $descriptionMatch.Success) {
            $errors.Add("Meta description not found: $file")
            continue
        }

        $description = $descriptionMatch.Groups[1].Value.TrimEnd([char[]]@([char]0x3002, [char]0x002E))
        $anchor = if ($fileIndex -eq 0) { " id=`"$($section.Id)`"" } else { '' }
        $lines.Add("          <article class=`"document-card`"$anchor>")
        $lines.Add("            <p class=`"document-card-category document-card-category-$($section.Id)`"><span aria-hidden=`"true`">$($section.Icon)</span> $($section.Label)</p>")
        $lines.Add("            <h3><a href=`"$href`">$($sidebarLinks[$file])</a></h3>")
        $lines.Add("            <p>$description</p>")
        $lines.Add('          </article>')
    }
}

$lines.Add('        </div>')
$lines.Add('      </section>')
$lines.Add('      <!-- home-groups:end -->')
$expectedGroups = $lines -join $newline
$groupPattern = if ($content.Contains('<!-- home-groups:start -->')) {
    '(?s)      <!-- home-groups:start -->.*?      <!-- home-groups:end -->'
} else {
    '(?s)      <h2 id="guides">.*?      </section>'
}
$groupBlock = [regex]::Match($content, $groupPattern)

if (-not $groupBlock.Success) {
    $errors.Add('Home group marker not found')
} elseif ($groupBlock.Value -cne $expectedGroups) {
    if ($Check) {
        $errors.Add('Home groups are out of sync')
    } else {
        $content = $content.Substring(0, $groupBlock.Index) +
            $expectedGroups +
            $content.Substring($groupBlock.Index + $groupBlock.Length)
    }
}

$tocLines = [System.Collections.Generic.List[string]]::new()
$tocLines.Add('    <aside class="toc" aria-label="Table of contents">')
$tocLines.Add("      <h2>$pageInside</h2>")

for ($sectionIndex = 0; $sectionIndex -lt $homeSections.Count; $sectionIndex++) {
    $section = $homeSections[$sectionIndex]
    $activeClass = if ($sectionIndex -eq 0) { ' class="active"' } else { '' }
    $tocLines.Add("      <a$activeClass href=`"#$($section.Id)`">$($section.Label)</a>")
}

$tocLines.Add('    </aside>')
$expectedToc = $tocLines -join $newline
$tocMatch = [regex]::Match(
    $content,
    '(?s)    <aside class="toc" aria-label="Table of contents">.*?    </aside>'
)

if (-not $tocMatch.Success) {
    $errors.Add('Home table of contents marker not found')
} elseif ($tocMatch.Value -cne $expectedToc) {
    if ($Check) {
        $errors.Add('Home table of contents is out of sync')
    } else {
        $content = $content.Substring(0, $tocMatch.Index) +
            $expectedToc +
            $content.Substring($tocMatch.Index + $tocMatch.Length)
    }
}

if ($errors.Count -gt 0) {
    foreach ($errorMessage in $errors) {
        [Console]::Error.WriteLine($errorMessage)
    }

    exit 1
}

if ($Check) {
    Write-Host 'Home group check passed'
} else {
    [System.IO.File]::WriteAllText($indexPath, $content, $utf8NoBom)
    Write-Host 'Synchronized home groups'
}
