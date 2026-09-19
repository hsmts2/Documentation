param(
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$tutorialsRoot = Join-Path $root 'tutorials'
$groups = @(
    [pscustomobject]@{
        Label = '記事'
        Icon = '✎'
        Pages = @(
            [pscustomobject]@{ File = 'cloudflare-private-site.html'; Label = 'Private GitHubリポジトリをCloudflare Workersで認証付き公開してみた' }
            [pscustomobject]@{ File = 'aws-daily-cost-slack.html'; Label = 'AWS利用料を毎朝3時にSlackへ通知してみた' }
            [pscustomobject]@{
                Label = '[PoC] マルチVPC・閉域VDI基盤案件'
                Children = @(
                    [pscustomobject]@{ File = 'workspaces-skill-transfer.html'; Label = '全体構築・運用順序' }
                    [pscustomobject]@{ File = 'workspaces-managed-ad.html'; Label = 'Managed Microsoft ADの構築' }
                    [pscustomobject]@{ File = 'workspaces-managed-ad-users.html'; Label = 'Managed Microsoft ADのユーザー・グループ管理' }
                    [pscustomobject]@{ File = 'workspaces-management-ec2.html'; Label = '管理用EC2の起動・接続・AD管理' }
                    [pscustomobject]@{ File = 'workspaces-ad-connector-account.html'; Label = 'AD Connector用サービスアカウント・権限委任' }
                    [pscustomobject]@{ File = 'workspaces-ad-connector.html'; Label = 'AD ConnectorのVPCピアリング・SG設定・作成' }
                    [pscustomobject]@{ File = 'workspaces-provisioning-gpo.html'; Label = 'WorkSpaces Personalの構築・接続' }
                    [pscustomobject]@{ File = 'workspaces-target-ou.html'; Label = 'WorkSpaces用ターゲットOUの作成・権限委任' }
                    [pscustomobject]@{ File = 'workspaces-gpo.html'; Label = 'WorkSpaces用GPOの作成・適用・運用' }
                    [pscustomobject]@{ File = 'workspaces-image-bundle.html'; Label = 'WorkSpacesカスタムイメージ作成・共有' }
                    [pscustomobject]@{ File = 'workspaces-systems-manager.html'; Label = 'Systems Manager環境構築' }
                    [pscustomobject]@{ File = 'workspaces-patch-manager.html'; Label = 'Patch Managerの設定' }
                    [pscustomobject]@{ File = 'workspaces-patch-operations.html'; Label = 'Patch Managerの実行・結果確認・運用' }
                    [pscustomobject]@{ File = 'workspaces-cost-optimizer.html'; Label = 'Cost Optimizerの構築・設定' }
                    [pscustomobject]@{ File = 'workspaces-cost-optimizer-dry-run.html'; Label = 'Cost OptimizerのDry Run解除' }
                    [pscustomobject]@{ File = 'workspaces-cost-optimizer-schedule.html'; Label = 'Cost Optimizerの実行スケジュール設定・変更' }
                    [pscustomobject]@{ File = 'workspaces-cost-optimizer-reports.html'; Label = 'Cost Optimizerのレポート・監視' }
                    [pscustomobject]@{ File = 'workspaces-cloudwatch-monitoring.html'; Label = 'CloudWatchのEC2・Windows OS監視とSNS通知' }
                    [pscustomobject]@{ File = 'workspaces-cloudwatch-workspaces.html'; Label = 'CloudWatchのWorkSpaces監視' }
                )
            }
        )
    }
    [pscustomobject]@{
        Label = 'Git / GitHub'
        Icon = '⑂'
        Pages = @(
            [pscustomobject]@{ File = 'git-github.html'; Label = 'Git / GitHub 概要' }
            [pscustomobject]@{ File = 'git-utilities.html'; Label = 'Gitトラブルシューティング' }
            [pscustomobject]@{ File = 'github-slack-integration.html'; Label = 'GitHubとSlackの連携・通知設定' }
        )
    }
    [pscustomobject]@{
        Label = 'Terraform'
        Icon = '◈'
        Pages = @(
            [pscustomobject]@{ File = 'terraform.html'; Label = 'Terraform 概要' }
            [pscustomobject]@{ File = 'hcp-terraform.html'; Label = 'HCP Terraform（Terraform Cloud）' }
        )
    }
    [pscustomobject]@{
        Label = 'AWS'
        Icon = '☁︎'
        Pages = @(
            [pscustomobject]@{ File = 'cloudformation.html'; Label = 'CloudFormation 運用手順集' }
            [pscustomobject]@{ File = 'aws-cli.html'; Label = 'AWS CLI 特殊対応' }
            [pscustomobject]@{ File = 'aws-cli-reference.html'; Label = 'AWS CLI コマンドリファレンス' }
            [pscustomobject]@{ File = 'eventbridge-scheduler.html'; Label = 'EventBridge Scheduler' }
            [pscustomobject]@{ File = 'aws-directory-service.html'; Label = 'AWS Directory Service 運用手順' }
            [pscustomobject]@{ File = 'amazon-workspaces.html'; Label = 'Amazon WorkSpaces' }
            [pscustomobject]@{ File = 'amazon-ses.html'; Label = 'Amazon SES SMTPリレー' }
            [pscustomobject]@{ File = 'amazon-ses-monitoring.html'; Label = 'Amazon SES 配信監視' }
            [pscustomobject]@{ File = 'amazon-rds-blue-green.html'; Label = 'Amazon RDS Blue/Green Deployments' }
            [pscustomobject]@{ File = 'apache-acm-certificate-update.html'; Label = '証明書更新（ACMエクスポート）' }
        )
    }
    [pscustomobject]@{
        Label = 'OS／ミドルウェア'
        Icon = '⚙︎'
        Pages = @(
            [pscustomobject]@{ File = 'rhel9.html'; Label = 'Red Hat Enterprise Linux 9' }
            [pscustomobject]@{ File = 'rhel10.html'; Label = 'Red Hat Enterprise Linux 10' }
            [pscustomobject]@{ File = 'amazon-linux-2023.html'; Label = 'Amazon Linux 2023' }
            [pscustomobject]@{ File = 'windows-server-2022.html'; Label = 'Windows Server 2022' }
            [pscustomobject]@{ File = 'windows-server-2025.html'; Label = 'Windows Server 2025' }
            [pscustomobject]@{ File = 'windows-server-2016-upgrade.html'; Label = 'Windows Server 2016 インプレースアップグレード' }
            [pscustomobject]@{ File = 'storage.html'; Label = 'ストレージ管理' }
            [pscustomobject]@{ File = 'apache.html'; Label = 'Apache' }
            [pscustomobject]@{ File = 'apache-self-signed-ssl-termination.html'; Label = 'Apache SSL終端（自己署名証明書）' }
            [pscustomobject]@{ File = 'redis.html'; Label = 'Redis（KVS）' }
            [pscustomobject]@{ File = 'nfs.html'; Label = 'NFS' }
            [pscustomobject]@{ File = 'samba.html'; Label = 'Samba' }
            [pscustomobject]@{ File = 'mariadb.html'; Label = 'MariaDB' }
            [pscustomobject]@{ File = 'postgresql.html'; Label = 'PostgreSQL' }
        )
    }
    [pscustomobject]@{
        Label = 'リファレンス'
        Icon = '▤'
        Pages = @(
            [pscustomobject]@{ RootFile = 'writing-style-guide.html'; Label = '[GitHub Pages] 記法・テンプレート' }
            [pscustomobject]@{ File = 'troubleshooting.html'; Label = '障害切り分けチェックリスト' }
            [pscustomobject]@{ File = 'eol.html'; Label = 'EOL / ライフサイクル一覧表' }
        )
    }
)
$pages = @(
    foreach ($group in $groups) {
        foreach ($page in $group.Pages) {
            if ($page.Children) {
                foreach ($child in $page.Children) {
                    $child
                }
            } elseif ($page.File) {
                $page
            }
        }
    }
)
$hiddenAliasFiles = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
[void]$hiddenAliasFiles.Add('ec2-rhel9-apache-https.html')
[void]$hiddenAliasFiles.Add('rhel9-apache-tls.html')
[void]$hiddenAliasFiles.Add('apache-self-signed-https.html')
[void]$hiddenAliasFiles.Add('aws-certificate-manager.html')

$errors = [System.Collections.Generic.List[string]]::new()
$pageFiles = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

foreach ($page in $pages) {
    [void]$pageFiles.Add($page.File)

    if (-not (Test-Path -LiteralPath (Join-Path $tutorialsRoot $page.File))) {
        $errors.Add("Missing tutorial page: $($page.File)")
    }
}

foreach ($rootPage in @($groups.Pages | Where-Object { $_.RootFile })) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $rootPage.RootFile))) {
        $errors.Add("Missing root page: $($rootPage.RootFile)")
    }
}

foreach ($aliasFile in $hiddenAliasFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $tutorialsRoot $aliasFile))) {
        $errors.Add("Missing hidden alias page: $aliasFile")
    }
}

$targets = @(
    Get-Item -LiteralPath (Join-Path $root 'index.html')
    Get-Item -LiteralPath (Join-Path $PSScriptRoot 'workspaces-sidebar.html')
    Get-ChildItem -LiteralPath $tutorialsRoot -File -Filter '*.html' |
        Where-Object { -not $hiddenAliasFiles.Contains($_.Name) } |
        Sort-Object Name
)
$pattern = '(?s)(?:    )?<aside id="site-sidebar" class="sidebar" aria-label="[^"]+">.*?    </aside>'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$updatedCount = 0

foreach ($target in $targets) {
    $isIndex = $target.FullName -eq (Join-Path $root 'index.html')
    $isTemplate = $target.FullName -eq (Join-Path $PSScriptRoot 'workspaces-sidebar.html')

    if (-not $isIndex -and -not $isTemplate -and -not $pageFiles.Contains($target.Name)) {
        $errors.Add("Page list manifest does not include: $($target.Name)")
        continue
    }

    $content = [System.IO.File]::ReadAllText($target.FullName)
    $match = [regex]::Match($content, $pattern)

    if (-not $match.Success) {
        $errors.Add("Sidebar marker not found: $($target.FullName)")
        continue
    }

    $newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
    $hrefPrefix = if ($isIndex) { 'tutorials/' } else { '' }
    $activeFile = if ($isIndex -or $isTemplate) { $null } else { $target.Name }
    $lines = [System.Collections.Generic.List[string]]::new()

    $lines.Add('    <aside id="site-sidebar" class="sidebar" aria-label="Page list">')
    $lines.Add('      <div class="sidebar-heading">')
    $lines.Add('        <button class="icon-button sidebar-toggle sidebar-toggle-inline" type="button" aria-controls="site-sidebar" aria-expanded="true" title="ナビゲーションを閉じる" aria-label="ナビゲーションを閉じる">☰</button>')
    $lines.Add('      </div>')

    foreach ($group in $groups) {
        $lines.Add("      <p class=`"sidebar-group`"><span class=`"sidebar-group-icon`" aria-hidden=`"true`">$($group.Icon)</span>$($group.Label)</p>")

        foreach ($page in $group.Pages) {
            if ($page.RootFile) {
                $rootHref = if ($isIndex) { $page.RootFile } else { "../$($page.RootFile)" }
                $lines.Add("      <a href=`"$rootHref`">$($page.Label)</a>")
            } elseif ($page.Children) {
                $lines.Add("      <p class=`"sidebar-group`"><span class=`"sidebar-group-icon`" aria-hidden=`"true`">☁︎</span>$($page.Label)</p>")
                foreach ($child in $page.Children) {
                    $activeClass = if ($child.File -eq $activeFile) { ' class="active" aria-current="page"' } else { '' }
                    $lines.Add("          <a$activeClass href=`"$hrefPrefix$($child.File)`">$($child.Label)</a>")
                }
            } else {
                $activeClass = if ($page.File -eq $activeFile) { ' class="active" aria-current="page"' } else { '' }
                $lines.Add("      <a$activeClass href=`"$hrefPrefix$($page.File)`">$($page.Label)</a>")
            }
        }
    }

    $lines.Add('    </aside>')
    $expected = $lines -join $newline

    if ($match.Value -cne $expected) {
        $relativePath = $target.FullName.Substring($root.Length).TrimStart('\', '/')

        if ($Check) {
            $errors.Add("Page list is out of sync: $relativePath")
            continue
        }

        $updated = $content.Substring(0, $match.Index) + $expected + $content.Substring($match.Index + $match.Length)
        [System.IO.File]::WriteAllText($target.FullName, $updated, $utf8NoBom)
        $updatedCount++
    }
}

if ($errors.Count -gt 0) {
    foreach ($errorMessage in $errors) {
        [Console]::Error.WriteLine($errorMessage)
    }

    exit 1
}

if ($Check) {
    Write-Host 'Page list check passed'
} else {
    Write-Host "Synchronized page list in $updatedCount file(s)"
}
