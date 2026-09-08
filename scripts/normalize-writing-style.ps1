$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$targetFiles = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -File -Filter "*.html" |
    Where-Object { $_.FullName -notmatch "[\\/]\.git[\\/]" }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$blockPattern = [regex]::new(
    "<(?<tag>p|li|td|th|strong|figcaption)(?:\s[^>]*)?>(?<body>.*?)</\k<tag>>",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$inlineClosingTags = "(?=(?:\s*</(?:a|code|strong|em|span|p)>)*\s*$)"
$structuralClosingTags = "(?=(?:\s*</(?:a|code|strong|em|span)>)*\s*</(?:div|section|aside|main|article|h[1-6])>)"
$fullStop = [string][char]0x3002

$commonReplacements = @(
    @{ From = "記載しております"; To = "記載する" },
    @{ From = "読み替えます"; To = "読み替える" },
    @{ From = "対応付けます"; To = "対応付ける" },
    @{ From = "割り当てます"; To = "割り当てる" },
    @{ From = "控えます"; To = "控える" },
    @{ From = "閉じます"; To = "閉じる" },
    @{ From = "進みません"; To = "進まない" },
    @{ From = "扱いません"; To = "扱わない" },
    @{ From = "待ちます"; To = "待機する" },
    @{ From = "押します"; To = "押下する" },
    @{ From = "権限にします"; To = "権限へ制限" },
    @{ From = "戻します"; To = "戻す" },
    @{ From = "戻する"; To = "戻す" },
    @{ From = "残ります"; To = "残る" },
    @{ From = "残します"; To = "残す" },
    @{ From = "残する"; To = "残す" },
    @{ From = "減らします"; To = "減らす" },
    @{ From = "減らする"; To = "減らす" },
    @{ From = "読み直します"; To = "読み直す" },
    @{ From = "読み直する"; To = "読み直す" },
    @{ From = "ファイルから渡します"; To = "ファイルから渡す" },
    @{ From = "ファイルから渡する"; To = "ファイルから渡す" },
    @{ From = "置き換わりません"; To = "置き換わらない" },
    @{ From = "入れません"; To = "入れない" },
    @{ From = "使いません"; To = "使わない" },
    @{ From = "置きません"; To = "置かない" },
    @{ From = "されていません"; To = "されていない" },
    @{ From = "されています"; To = "されている" },
    @{ From = "していません"; To = "していない" },
    @{ From = "しています"; To = "している" },
    @{ From = "となっています"; To = "となっている" },
    @{ From = "なっています"; To = "なっている" },
    @{ From = "ていません"; To = "ていない" },
    @{ From = "ています"; To = "ている" },
    @{ From = "できません"; To = "できない" },
    @{ From = "ではありません"; To = "ではない" },
    @{ From = "ありません"; To = "ない" },
    @{ From = "されません"; To = "されない" },
    @{ From = "しません"; To = "しない" },
    @{ From = "なりません"; To = "ならない" },
    @{ From = "られません"; To = "られない" },
    @{ From = "できます"; To = "できる" },
    @{ From = "されます"; To = "される" },
    @{ From = "なります"; To = "なる" },
    @{ From = "られます"; To = "られる" },
    @{ From = "しました"; To = "した" },
    @{ From = "でした"; To = "だった" },
    @{ From = "開きます"; To = "開く" },
    @{ From = "受け取ります"; To = "受け取る" },
    @{ From = "抑えます"; To = "抑える" },
    @{ From = "増えます"; To = "増える" },
    @{ From = "疑います"; To = "疑う" },
    @{ From = "起こります"; To = "起こる" },
    @{ From = "上がります"; To = "上がる" },
    @{ From = "分けます"; To = "分ける" },
    @{ From = "合わせます"; To = "合わせる" },
    @{ From = "行います"; To = "行う" },
    @{ From = "切り替えます"; To = "切り替える" },
    @{ From = "参加させます"; To = "参加させる" },
    @{ From = "向きます"; To = "向く" },
    @{ From = "つかみます"; To = "つかむ" },
    @{ From = "読み込みます"; To = "読み込む" },
    @{ From = "受けます"; To = "受ける" },
    @{ From = "避けます"; To = "避ける" },
    @{ From = "含めます"; To = "含める" },
    @{ From = "進みます"; To = "進む" },
    @{ From = "組み合わせます"; To = "組み合わせる" },
    @{ From = "取り込みます"; To = "取り込む" },
    @{ From = "置き換えます"; To = "置き換える" },
    @{ From = "寄せます"; To = "寄せる" },
    @{ From = "関連付けます"; To = "関連付ける" },
    @{ From = "切り分けます"; To = "切り分ける" },
    @{ From = "扱います"; To = "扱う" },
    @{ From = "まとめます"; To = "まとめる" },
    @{ From = "使います"; To = "使う" },
    @{ From = "従います"; To = "従う" },
    @{ From = "切り替わります"; To = "切り替わる" },
    @{ From = "減らせます"; To = "減らせる" },
    @{ From = "確定させます"; To = "確定させる" },
    @{ From = "あります"; To = "ある" },
    @{ From = "れます"; To = "れる" },
    @{ From = "です"; To = "" }
)
$procedureReplacements = @(
    @{ From = "受ける"; To = "受信" },
    @{ From = "切り替える"; To = "切り替え" }
)

foreach ($file in $targetFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)

    $normalized = $blockPattern.Replace(
        $content,
        [System.Text.RegularExpressions.MatchEvaluator] {
            param($match)

            $tag = $match.Groups["tag"].Value
            $body = $match.Groups["body"].Value
            $prefix = $content.Substring(0, $match.Index)
            $isOrderedListItem = $tag -eq "li" -and
                $prefix.LastIndexOf("<ol") -gt $prefix.LastIndexOf("</ol>")
            $isNestedOrderedListParagraph = $tag -eq "p" -and
                $prefix.LastIndexOf("<ol") -gt $prefix.LastIndexOf("</ol>")
            $isProcedure = $isOrderedListItem -or $isNestedOrderedListParagraph -or (
                $tag -eq "p" -and
                $match.Value -match '^<p[^>]*\bclass="[^"]*\bprocedure-step\b'
            )

            $body = [regex]::Replace(
                $body,
                [regex]::Escape($fullStop) + $inlineClosingTags,
                ""
            )

            foreach ($replacement in $commonReplacements) {
                $pattern = [regex]::Escape($replacement.From) + $inlineClosingTags
                $body = [regex]::Replace($body, $pattern, $replacement.To)
            }

            $suruReplacement = if ($isProcedure) { "" } else { "する" }
            $body = [regex]::Replace(
                $body,
                [regex]::Escape("します") + $inlineClosingTags,
                $suruReplacement
            )

            if ($isProcedure) {
                $body = [regex]::Replace(
                    $body,
                    [regex]::Escape("する") + $inlineClosingTags,
                    ""
                )
            }

            if ($isProcedure) {
                foreach ($replacement in $procedureReplacements) {
                    $pattern = [regex]::Escape($replacement.From) + $inlineClosingTags
                    $body = [regex]::Replace($body, $pattern, $replacement.To)
                }
            }

            return "<$tag" + $match.Value.Substring($tag.Length + 1, $match.Groups["body"].Index - $match.Index - $tag.Length - 1) +
                $body + "</$tag>"
        }
    )

    # Callouts and notices sometimes contain text directly under a structural element.
    # Normalize only the final sentence before that element closes.
    $normalized = [regex]::Replace(
        $normalized,
        [regex]::Escape($fullStop) + $structuralClosingTags,
        ""
    )

    foreach ($replacement in $commonReplacements) {
        $pattern = [regex]::Escape($replacement.From) + $structuralClosingTags
        $normalized = [regex]::Replace($normalized, $pattern, $replacement.To)
    }

    $normalized = [regex]::Replace(
        $normalized,
        [regex]::Escape("します") + $structuralClosingTags,
        "する"
    )

    if ($normalized -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $normalized, $utf8NoBom)
        Write-Host "Normalized $($file.FullName)"
    }
}
