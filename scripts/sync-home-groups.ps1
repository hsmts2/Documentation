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
$sectionIds = @('articles', 'poc', 'git-github', 'terraform', 'aws-cloud', 'os-server', 'reference')

if ($groupMatches.Count -ne $sectionIds.Count) {
    throw "Expected $($sectionIds.Count) sidebar groups, found $($groupMatches.Count)"
}

$sidebarLinks = @{}

foreach ($group in $groupMatches) {
    foreach ($linkMatch in [regex]::Matches($group.Groups[2].Value, 'href="tutorials/([^"]+)">([^<]+)</a>')) {
        $sidebarLinks[$linkMatch.Groups[1].Value] = $linkMatch.Groups[2].Value
    }
}

$homeSections = @(
    [pscustomobject]@{ Id = 'articles'; Icon = '&#128221;'; Label = $groupMatches[0].Groups[1].Value; Files = @('cloudflare-private-site.html', 'aws-daily-cost-slack.html', 'workspaces-skill-transfer.html') },
    [pscustomobject]@{ Id = 'terraform'; Icon = '&#129521;'; Label = 'Terraform'; Files = @('terraform.html', 'hcp-terraform.html') },
    [pscustomobject]@{ Id = 'git-github'; Icon = '⑂'; Label = 'Git / GitHub'; Files = @('git-github.html', 'git-utilities.html') },
    [pscustomobject]@{ Id = 'reference'; Icon = '&#128218;'; Label = $groupMatches[6].Groups[1].Value; Files = @('writing-style-guide.html', 'troubleshooting.html', 'eol.html') },
    [pscustomobject]@{ Id = 'aws-platform'; Icon = '&#128736;&#65039;'; Label = 'AWS &#22522;&#30436;&#65295;CLI'; Files = @('cloudformation.html', 'aws-cli.html', 'aws-cli-reference.html') },
    [pscustomobject]@{ Id = 'aws-services'; Icon = '&#9729;&#65039;'; Label = 'AWS &#12469;&#12540;&#12499;&#12473;'; Files = @('eventbridge-scheduler.html', 'aws-directory-service.html', 'amazon-workspaces.html', 'amazon-ses.html', 'amazon-ses-monitoring.html', 'amazon-rds-blue-green.html', 'apache-acm-certificate-update.html') },
    [pscustomobject]@{ Id = 'operating-systems'; Icon = '&#128187;'; Label = 'OS'; Files = @('rhel9.html', 'rhel10.html', 'amazon-linux-2023.html', 'windows-server-2022.html', 'windows-server-2025.html', 'windows-server-2016-upgrade.html') },
    [pscustomobject]@{ Id = 'web-databases'; Icon = '&#127760;'; Label = 'Web&#65295;&#12487;&#12540;&#12479;&#12505;&#12540;&#12473;'; Files = @('apache.html', 'apache-self-signed-ssl-termination.html', 'redis.html', 'mariadb.html', 'postgresql.html') },
    [pscustomobject]@{ Id = 'storage-filesharing'; Icon = '&#128190;'; Label = '&#12473;&#12488;&#12524;&#12540;&#12472;&#65295;&#12501;&#12449;&#12452;&#12523;&#20849;&#26377;'; Files = @('storage.html', 'nfs.html', 'samba.html') }
)
$sidebarLinks['writing-style-guide.html'] = '[GitHub Pages] &#35352;&#27861;&#12539;&#12486;&#12531;&#12503;&#12524;&#12540;&#12488;'
$sidebarLinks['workspaces-skill-transfer.html'] = '&#12510;&#12523;&#12481;VPC&#12539;&#38281;&#22495;VDI&#22522;&#30436;&#26696;&#20214;&#65288;9&#12506;&#12540;&#12472;&#65289;'
$skillTransferDescription = '複数VPCへ分離した閉域VDI基盤の構築順序と、Managed Microsoft AD、AD Connector、Amazon WorkSpacesの運用手順'

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
        if ($file -eq 'workspaces-skill-transfer.html') { $description = $skillTransferDescription }
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
